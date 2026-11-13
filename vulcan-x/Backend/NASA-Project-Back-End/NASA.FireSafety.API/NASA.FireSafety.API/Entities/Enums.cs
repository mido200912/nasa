namespace NASA.FireSafety.API.Entities;

public enum ResearchSourceType { PsiDataset, NasaPublication, JournalArticle, TechnicalReport, Other }
public enum ResearchOrigin { NasaOriginal, ThirdParty }
public enum CurationStatus { Draft, MetadataReviewed, ApprovedForDisplay }
public enum EnvironmentType { OrbitalStation, LunarSurface, MarsSurface, Other }
public enum GravityRegime { Microgravity, ReducedGravity, EarthLike, Hypergravity, Unspecified }
public enum PropertyValueType { Numeric, Text }
public enum ExperimentParameterCategory { Condition, Measurement, Result }
public enum ExperimentParameterValueType { Numeric, Text, Range }
public enum ExperimentSourceRole { Primary, Dataset, Publication, Related }
public enum AnalysisStatus { Pending, Running, Completed, Failed }
public enum AnalysisBasis { Mock, LlmInterpretationOnly, ValidatedModel }
public enum AnalysisFactorDirection { IncreasesRisk, DecreasesRisk, Unclear }
public enum CitationMatchStatus { Matched, Unmatched }
public enum KnowledgeGroundingStatus { HasMatchedCitations, HasOnlyUnmatchedCitations, NoCitations }
public enum TechnologyCategory { FireDetection, FireSuppression, SmokeMonitoring, BuildingSafety, Other }
public enum TechnologyApplicationDomain { Space, Earth }
public enum TechnologyEvidenceLevel { DocumentedInSource, TeamProposed }
