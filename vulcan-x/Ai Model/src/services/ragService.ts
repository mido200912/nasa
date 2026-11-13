import { OFFICIAL_NASA_CORPUS } from '../data/official_nasa_corpus';
import nasaLinkIntelligence from '../data/nasa_link_intelligence.json';
import type { AiProviderService } from './aiProviderService';
import type {
  AiQueryRequest,
  AiQueryResponse,
  EnvironmentType,
  LinkIntelligence,
  RagChunk,
  RiskLevel,
  SearchResult,
} from '../types';

/** Common synonyms dictionary to expand query semantics across space combustion domains. */
const SYNONYM_MAP: Record<string, string[]> = {
  burn: ['flame', 'combustion', 'ignition', 'fire'],
  burning: ['flame', 'combustion', 'fire', 'spread'],
  spread: ['propagation', 'flame spread', 'growth'],
  materials: ['solids', 'fuel', 'pmma', 'nomex', 'teflon', 'samples'],
  material: ['solid', 'fuel', 'pmma', 'nomex', 'teflon', 'sample'],
  air: ['atmosphere', 'oxygen', 'o2', 'gas'],
  tank: ['cylinder', 'vessel', 'canister', 'scba'],
  tanks: ['cylinders', 'vessels', 'canisters', 'scba'],
  escape: ['egress', 'evacuation', 'hatch'],
  smoke: ['particulate', 'particles', 'respirator', 'soot'],
  choking: ['smoke', 'toxic', 'respirator', 'inhalation'],
  extinguish: ['suppression', 'extinction', 'inert gas', 'suppressants'],
  extinguisher: ['suppression', 'inert gas', 'suppressants'],
  suit: ['attire', 'turnout', 'gear', 'protective'],
  gear: ['attire', 'turnout', 'suit', 'protective'],
  incident: ['accident', 'fire', 'apollo', 'mir'],
  incidents: ['accidents', 'fires', 'apollo', 'mir'],
  glenn: ['combustion science', 'bass', 'acme', 'flex'],
  station: ['iss', 'mir', 'space station'],
};

/**
 * Intelligent Source-first retrieval, Link Navigator & Generative AI Synthesis over official NASA corpus.
 */
export class RagService {
  private readonly documents: RagChunk[] = OFFICIAL_NASA_CORPUS;
  private readonly linkDatabase = (nasaLinkIntelligence as any).sources || [];
  private readonly aiProvider: AiProviderService;

  constructor(aiProvider: AiProviderService) {
    this.aiProvider = aiProvider;
  }

  public async query(req: AiQueryRequest): Promise<AiQueryResponse> {
    const searchResults = this.searchKnowledgeBase(req.question, req.environment);
    const selectedDocs = searchResults.slice(0, 4).map(({ doc }) => doc);

    if (selectedDocs.length === 0) {
      return {
        success: true,
        answer: 'No source-supported answer is available in the official NASA corpus for this question. Refine the question or ingest an official NASA source that addresses it.',
        sources: [],
        retrieved_chunks: [],
        emergency_playbook: [],
        risk_level: 'Low',
      };
    }

    // Retrieve matching link intelligence for deep context
    const matchingLinkDetails = this.findMatchingLinkIntelligence(selectedDocs);

    // Try AI generation grounded strictly on the retrieved NASA links and chunks
    let finalAnswer = this.composeDeterministicAnswer(selectedDocs, matchingLinkDetails);

    try {
      const systemPrompt = `You are Vulcan-X AI, a NASA Space Apps fire safety and microgravity combustion expert.
Answer the user's question accurately and strictly based on the provided NASA facts, experiments, data points, and links.
Do NOT hallucinate or extrapolate beyond the provided verified sources.
Reference the exact experiments (e.g. BASS, ACME, FLEX), historical investigations (e.g. Apollo 1, Apollo 13, Mir), or Spinoff technologies where relevant.
Always include the official source URLs for citation.`;

      const userPrompt = `USER QUESTION: "${req.question}"
ENVIRONMENT: ${req.environment}

VERIFIED NASA SOURCES & RESEARCH FINDINGS:
${JSON.stringify({
  chunks: selectedDocs.map(c => ({
    title: c.citation_title,
    text: c.text_content,
    summary: c.summary,
    findings: c.key_findings,
    url: c.source_url
  })),
  deep_link_intelligence: matchingLinkDetails.map(l => ({
    title: l.title,
    discipline: l.primary_discipline,
    summary: l.executive_summary,
    experiments: l.key_experiments_and_payloads,
    physics: l.core_physics_takeaways,
    safety_apps: l.practical_safety_applications,
    url: l.url
  }))
}, null, 2)}

Provide a structured, authoritative, and direct answer citing the relevant NASA sources and specific experimental findings.`;

      // Timeout fast (7 seconds) so UI remains instantaneous; seamless fallback to deterministic synthesis
      const aiPromise = this.aiProvider.generateCompletion(userPrompt, systemPrompt);
      const timeoutPromise = new Promise<{ text: string }>((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timeout')), 7000)
      );

      const aiResponse = await Promise.race([aiPromise, timeoutPromise]);
      if (aiResponse && aiResponse.text && aiResponse.text.trim().length > 30) {
        finalAnswer = aiResponse.text.trim();
      }
    } catch {
      // In case of timeout or offline, deterministic answer is retained
    }

    return {
      success: true,
      answer: finalAnswer,
      sources: [...new Set(selectedDocs.map((chunk) => chunk.source_url))],
      retrieved_chunks: selectedDocs,
      emergency_playbook: this.createEmergencyPlaybook(selectedDocs, matchingLinkDetails),
      risk_level: this.calculateRiskLevel(req.question, req.environment, selectedDocs),
    };
  }

  /**
   * Return catalog of links with summarized intelligence, findings, and related tags.
   */
  public getLinkIntelligenceCatalog(): LinkIntelligence[] {
    const urlMap = new Map<string, {
      title: string;
      category: RagChunk['category'];
      summaries: string[];
      key_findings: string[];
      keywords: Set<string>;
      environments: Set<EnvironmentType>;
      chunk_ids: string[];
    }>();

    for (const doc of this.documents) {
      const existing = urlMap.get(doc.source_url);
      if (!existing) {
        urlMap.set(doc.source_url, {
          title: doc.citation_title.split('—')[0].trim(),
          category: doc.category,
          summaries: doc.summary ? [doc.summary] : [doc.text_content],
          key_findings: [...(doc.key_findings ?? [])],
          keywords: new Set(doc.keywords),
          environments: new Set(doc.environments),
          chunk_ids: [doc.id],
        });
      } else {
        if (doc.summary) existing.summaries.push(doc.summary);
        if (doc.key_findings) existing.key_findings.push(...doc.key_findings);
        doc.keywords.forEach((k) => existing.keywords.add(k));
        doc.environments.forEach((e) => existing.environments.add(e));
        existing.chunk_ids.push(doc.id);
      }
    }

    return Array.from(urlMap.entries()).map(([url, data]) => ({
      url,
      title: data.title,
      category: data.category,
      summary: data.summaries.join(' '),
      key_findings: [...new Set(data.key_findings)],
      keywords: Array.from(data.keywords),
      environments: Array.from(data.environments),
      chunk_ids: data.chunk_ids,
    }));
  }

  /**
   * Search links specifically based on a freeform query or URL matching.
   */
  public searchLinks(searchQuery: string): LinkIntelligence[] {
    const tokens = this.extractTokens(searchQuery);
    const catalog = this.getLinkIntelligenceCatalog();
    if (tokens.length === 0) return catalog;

    return catalog
      .map((item) => {
        const targetStr = `${item.title} ${item.url} ${item.summary} ${item.key_findings.join(' ')} ${item.keywords.join(' ')}`.toLowerCase();
        let score = 0;
        for (const token of tokens) {
          if (targetStr.includes(token)) score += 3;
        }
        return { item, score };
      })
      .filter((res) => res.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((res) => res.item);
  }

  /**
   * Find matching deep intelligence from nasa_link_intelligence.json for retrieved chunks.
   */
  private findMatchingLinkIntelligence(chunks: RagChunk[]): any[] {
    const urls = new Set(chunks.map(c => c.source_url));
    return this.linkDatabase.filter((entry: any) => urls.has(entry.url));
  }

  /** Simulation orchestration can use only incident-derived emergency steps. */
  public createEmergencyPlaybook(chunks: RagChunk[], linkDetails: any[] = []): string[] {
    const fromChunks = chunks.flatMap((chunk) => chunk.emergency_playbook ?? []);
    const fromLinks = linkDetails.flatMap((entry) => entry.emergency_playbook_rules ?? []);
    return [...new Set([...fromChunks, ...fromLinks])];
  }

  /**
   * Format grounded deterministic answer with chunk findings, link details, source URLs.
   */
  private composeDeterministicAnswer(chunks: RagChunk[], linkDetails: any[]): string {
    const chunkSections = chunks.map((chunk) => {
      const findingsSection =
        chunk.key_findings && chunk.key_findings.length > 0
          ? `\nKey Findings:\n${chunk.key_findings.map((f) => `• ${f}`).join('\n')}`
          : '';
      return `${chunk.text_content}${findingsSection}\nSource: ${chunk.citation_title} — ${chunk.source_url}`;
    });

    // If deep link highlights exist, append direct link takeaways
    const linkHighlights: string[] = [];
    for (const link of linkDetails) {
      if (link.core_physics_takeaways && link.core_physics_takeaways.length > 0) {
        linkHighlights.push(`\n[NASA Research Insight: ${link.title}]\n${link.core_physics_takeaways.map((p: string) => `• ${p}`).join('\n')}\nLink: ${link.url}`);
      }
    }

    return [...chunkSections, ...linkHighlights].join('\n\n');
  }

  /**
   * Enhanced Multi-Field Weighted Search with Synonym Expansion & Keyword Boosting.
   */
  public searchKnowledgeBase(query: string, environment: EnvironmentType): SearchResult[] {
    const rawTokens = this.extractTokens(query);
    if (rawTokens.length === 0) return [];

    // Expand tokens using synonym map
    const expandedTokens = new Set<string>(rawTokens);
    for (const t of rawTokens) {
      const syns = SYNONYM_MAP[t];
      if (syns) {
        syns.forEach((s) => expandedTokens.add(s.toLowerCase()));
      }
    }

    const queryTokenList = Array.from(expandedTokens);

    return this.documents
      .map((doc) => {
        let score = 0;

        const titleText = doc.citation_title.toLowerCase();
        const keywordsText = doc.keywords.join(' ').toLowerCase();
        const summaryText = (doc.summary ?? '').toLowerCase();
        const findingsText = (doc.key_findings ?? []).join(' ').toLowerCase();
        const contentText = doc.text_content.toLowerCase();
        const topicsText = (doc.related_topics ?? []).join(' ').toLowerCase();

        for (const token of queryTokenList) {
          const isDirectQueryToken = rawTokens.includes(token);
          const weightMultiplier = isDirectQueryToken ? 1.0 : 0.6; // Higher weight for direct query words

          if (titleText.includes(token)) score += 5.0 * weightMultiplier;
          if (keywordsText.includes(token)) score += 4.0 * weightMultiplier;
          if (summaryText.includes(token)) score += 3.0 * weightMultiplier;
          if (findingsText.includes(token)) score += 2.5 * weightMultiplier;
          if (topicsText.includes(token)) score += 2.0 * weightMultiplier;
          if (contentText.includes(token)) score += 1.5 * weightMultiplier;
        }

        // Environment match bonus
        if (doc.environments.includes(environment)) {
          score += 1.0;
        }

        return { doc, score };
      })
      // Minimum threshold to prevent spurious citations
      .filter((result) => result.score >= 2)
      .sort((a, b) => b.score - a.score);
  }

  private extractTokens(input: string): string[] {
    return (
      input
        .toLowerCase()
        .match(/[a-z0-9_-]+/g)
        ?.filter((token) => token.length > 2) ?? []
    );
  }

  private calculateRiskLevel(question: string, environment: EnvironmentType, chunks: RagChunk[]): RiskLevel {
    const text = `${question} ${chunks.map((chunk) => chunk.text_content).join(' ')}`.toLowerCase();
    if (/(pure oxygen|oxygen generating system|fire spread quickly|toxic|escape|catastrophic|rupture)/.test(text)) {
      return 'High';
    }
    if (environment !== 'earth' && /(microgravity|combustion|fire|oxygen|suppression|flame)/.test(text)) {
      return 'Medium';
    }
    return 'Low';
  }
}
