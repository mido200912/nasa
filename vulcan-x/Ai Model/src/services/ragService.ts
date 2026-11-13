import { OFFICIAL_NASA_CORPUS } from '../data/official_nasa_corpus';
import type { AiProviderService } from './aiProviderService';
import type { AiQueryRequest, AiQueryResponse, EnvironmentType, RagChunk, RiskLevel, SearchResult } from '../types';

/** Source-first retrieval over the official NASA ingestion snapshot. */
export class RagService {
  private readonly documents: RagChunk[] = OFFICIAL_NASA_CORPUS;

  // Retained for dependency-injection compatibility. Generation is never a fallback.
  constructor(_aiProvider: AiProviderService) {}

  public async query(req: AiQueryRequest, signal?: AbortSignal): Promise<AiQueryResponse> {
    signal?.throwIfAborted();
    const selectedDocs = this.searchKnowledgeBase(req.question, req.environment).slice(0, 4).map(({ doc }) => doc);

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

    return {
      success: true,
      answer: this.composeGroundedAnswer(selectedDocs),
      sources: [...new Set(selectedDocs.map((chunk) => chunk.source_url))],
      retrieved_chunks: selectedDocs,
      emergency_playbook: this.createEmergencyPlaybook(selectedDocs),
      risk_level: this.calculateRiskLevel(req.question, req.environment, selectedDocs),
    };
  }

  /** Simulation orchestration can use only incident-derived emergency steps. */
  public createEmergencyPlaybook(chunks: RagChunk[]): string[] {
    return [...new Set(chunks.flatMap((chunk) => chunk.emergency_playbook ?? []))];
  }

  private composeGroundedAnswer(chunks: RagChunk[]): string {
    return chunks.map((chunk) => `${chunk.text_content}\nSource: ${chunk.citation_title} — ${chunk.source_url}`).join('\n\n');
  }

  private searchKnowledgeBase(query: string, environment: EnvironmentType): SearchResult[] {
    const queryTokens = query.toLowerCase().match(/[a-z0-9]+/g)?.filter((token) => token.length > 2) ?? [];
    return this.documents
      .map((doc) => {
        const searchable = `${doc.citation_title} ${doc.text_content} ${doc.keywords.join(' ')}`.toLowerCase();
        const matchedTokens = queryTokens.filter((token) => searchable.includes(token)).length;
        return { doc, score: matchedTokens * 2 + (doc.environments.includes(environment) ? 0.5 : 0) };
      })
      // Environment alone must never manufacture a citation.
      .filter((result) => result.score >= 2)
      .sort((a, b) => b.score - a.score);
  }

  private calculateRiskLevel(question: string, environment: EnvironmentType, chunks: RagChunk[]): RiskLevel {
    const text = `${question} ${chunks.map((chunk) => chunk.text_content).join(' ')}`.toLowerCase();
    if (/(pure oxygen|oxygen generating system|fire spread quickly|toxic|escape)/.test(text)) return 'High';
    if (environment !== 'earth' && /(microgravity|combustion|fire|oxygen|suppression)/.test(text)) return 'Medium';
    return 'Low';
  }
}
