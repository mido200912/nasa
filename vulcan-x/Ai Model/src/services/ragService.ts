import { NASA_PSI_KNOWLEDGE_BASE } from '../data/nasa_psi_knowledge_base';
import type { AiProviderService } from './aiProviderService';
import type { AiQueryRequest, AiQueryResponse, EnvironmentType, RagDocument, RiskLevel, SearchResult } from '../types';

export class RagService {
  private documents: RagDocument[];
  private aiProvider: AiProviderService;

  constructor(aiProvider: AiProviderService) {
    this.documents = NASA_PSI_KNOWLEDGE_BASE;
    this.aiProvider = aiProvider;
  }

  /**
   * Performs semantic / lexical retrieval and synthesizes response via AI Provider
   */
  public async query(req: AiQueryRequest): Promise<AiQueryResponse> {
    const { question, environment } = req;

    // 1. Retrieve top matching NASA PSI documents
    const searchResults = this.searchKnowledgeBase(question, environment);
    const topDocs = searchResults.slice(0, 3).map((r) => r.doc);

    // If query has no matches, fallback to general environment-relevant docs
    const selectedDocs =
      topDocs.length > 0
        ? topDocs
        : this.documents.filter((d) => d.environment.includes(environment)).slice(0, 2);

    // 2. Extract citations
    const sources = selectedDocs.map((d) => `${d.investigation} (${d.citation.split('.')[0]})`);

    // 3. Compute scientific risk level
    const risk_level = this.calculateRiskLevel(question, environment, selectedDocs);

    // 4. Construct grounded context
    const contextText = selectedDocs
      .map(
        (d, i) =>
          `[Investigation Source ${i + 1}]: ${d.investigation} - ${d.title}\n` +
          `- Findings: ${d.findings}\n` +
          `- Gravity & Conditions: ${d.gravity_condition}\n` +
          `- Fire Safety Implication: ${d.fire_safety_implication}\n` +
          `- Citation: ${d.citation}`
      )
      .join('\n\n');

    const systemPrompt =
      `You are the chief AI Fire Safety & Combustion Engineer for Vulcan-X (2026 NASA Space Apps Challenge: "Flame in Freefall").\n` +
      `Your role is to analyze NASA Physical Science Informatics (PSI) combustion research (such as BASS, Saffire, ACME, FLEX, CFI, NASA-STD-6001).\n` +
      `Guidelines:\n` +
      `- Answer with high scientific rigor and aerospace precision.\n` +
      `- Zero hallucination: Base your factual explanations on the provided NASA PSI investigation data.\n` +
      `- Explicitly cite the investigation names (e.g. BASS, Saffire, FLEX, etc.) when explaining findings.\n` +
      `- Explain microgravity physical mechanisms (absence of buoyant convection, diffusive flame transport, radiative extinction, cool flame persistence).\n` +
      `- Clearly identify risks and mitigation protocols.`;

    const userPrompt =
      `Target Environment: ${environment.toUpperCase()}\n` +
      `Assessed Risk Level: ${risk_level}\n\n` +
      `NASA PSI Reference Context:\n${contextText}\n\n` +
      `Researcher Question: "${question}"\n\n` +
      `Please provide an insightful, scientifically referenced answer addressing the combustion physics, hazards, and safety countermeasures.`;

    // 5. Query AI provider (with 6-key rotation and zero-failover)
    const completion = await this.aiProvider.generateCompletion(userPrompt, systemPrompt);

    return {
      success: true,
      answer: completion.text,
      sources,
      risk_level,
    };
  }

  /**
   * Search knowledge base by calculating keyword, token, and environment overlap scores
   */
  private searchKnowledgeBase(query: string, environment: EnvironmentType): SearchResult[] {
    const queryTokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scored: SearchResult[] = this.documents.map((doc) => {
      let score = 0;

      // Environment match boost
      if (doc.environment.includes(environment)) {
        score += 3.0;
      }

      // Keyword match
      for (const kw of doc.keywords) {
        const kwLower = kw.toLowerCase();
        if (query.toLowerCase().includes(kwLower)) {
          score += 4.0;
        }
      }

      // Token overlap in title, findings, and description
      const textToSearch = `${doc.title} ${doc.findings} ${doc.description} ${doc.investigation}`.toLowerCase();
      for (const token of queryTokens) {
        if (textToSearch.includes(token)) {
          score += 1.5;
        }
      }

      return { doc, score };
    });

    return scored.sort((a, b) => b.score - a.score).filter((s) => s.score > 2.0);
  }

  /**
   * Scientific risk level calculation based on environment, parameters, and combustibility factors
   */
  private calculateRiskLevel(
    question: string,
    environment: EnvironmentType,
    _matchedDocs: RagDocument[]
  ): RiskLevel {
    const qLower = question.toLowerCase();

    // High risk keywords
    const highRiskTerms = [
      '30%',
      '34%',
      'high oxygen',
      'enriched oxygen',
      'pmma',
      'acrylic',
      'thermal runaway',
      'battery',
      'explosion',
      'rapid flame',
      'flashover',
      'confined duct',
      'high pressure',
      'uncontrolled',
      'leak',
    ];

    for (const term of highRiskTerms) {
      if (qLower.includes(term)) {
        return 'High';
      }
    }

    // Lunar base with enriched exploration atmosphere defaults to higher risk
    if (environment === 'lunar_base' && (qLower.includes('oxygen') || qLower.includes('pressure') || qLower.includes('fire'))) {
      return 'High';
    }

    // Moderate risk keywords
    const moderateRiskTerms = [
      'ventilation',
      'smoldering',
      'extinction',
      'nomex',
      'kapton',
      'soot',
      'sensor',
      'detector',
      'airflow',
      'microgravity',
    ];

    for (const term of moderateRiskTerms) {
      if (qLower.includes(term)) {
        return 'Medium';
      }
    }

    if (environment === 'iss' || environment === 'mars_rover') {
      return 'Medium';
    }

    return 'Low';
  }
}

