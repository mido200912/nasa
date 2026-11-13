export type EnvironmentType = 'lunar_base' | 'mars_rover' | 'iss' | 'earth';
export type HabitatType = 'lunar' | 'mars' | 'iss';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type SafetyStatus = 'Safe' | 'Warning' | 'Critical';

export interface AiQueryRequest {
  question: string;
  environment: EnvironmentType;
}

export interface AiQueryResponse {
  success: boolean;
  answer: string;
  sources: string[];
  retrieved_chunks: RagChunk[];
  emergency_playbook: string[];
  risk_level: RiskLevel;
  generation: { mode: 'ProviderInference'; provider: 'openrouter'; model: string };
}

export interface StressTestRequest {
  habitat: HabitatType;
  oxygen_concentration: number;
  pressure_psi: number;
  material_type: string;
}

export interface SimulationResult {
  ignition_speed_multiplier: number;
  safety_status: SafetyStatus;
  recommendation: string;
}

export interface StressTestResponse {
  success: boolean;
  simulation_result: SimulationResult;
}

export type RagCategory = 'psi_research' | 'scientific_guide' | 'historical_incident' | 'earth_spinoff';

/** The persisted vector-store payload and the retrieval response contract. */
export interface RagChunk {
  id: string;
  text_content: string;
  source_url: string;
  citation_title: string;
  category: RagCategory;
  keywords: string[];
  environments: EnvironmentType[];
  summary?: string;
  key_findings?: string[];
  related_topics?: string[];
  emergency_playbook?: string[];
}

export interface LinkIntelligence {
  url: string;
  title: string;
  category: RagCategory;
  summary: string;
  key_findings: string[];
  keywords: string[];
  environments: EnvironmentType[];
  chunk_ids: string[];
}

/** @deprecated Use RagChunk. */
export type RagDocument = RagChunk;

export interface SearchResult {
  doc: RagChunk;
  score: number;
}

export type KeyStatus = 'ACTIVE' | 'RATE_LIMITED' | 'ERROR' | 'STANDBY';

export interface KeySlotInfo {
  index: number;
  provider: string;
  maskedKey: string;
  status: KeyStatus;
  failCount: number;
  successCount: number;
  lastUsedAt?: string;
  cooldownUntil?: string;
}

export interface KeyPoolStatus {
  totalKeys: number;
  activeKeyIndex: number;
  keys: KeySlotInfo[];
}

// ─── 3D Physics Engine Types ─────────────────────────────────────────────────

export type HazardSafetyStatus = 'NOMINAL' | 'ELEVATED_RISK' | 'CRITICAL_HAZARD';

export type FlameGeometryType =
  | 'spherical_blue_core'
  | 'hemispherical_spread'
  | 'buoyant_plume'
  | 'smoldering_surface'
  | 'ventilation_driven_trail'
  | 'micro_droplet_cool_flame'
  | 'none';

export interface PhysicsEngineRequest {
  target_planet_or_habitat: EnvironmentType;
  oxygen_concentration: number;
  pressure_psi: number;
  material_type: string;
}

export interface SimulationMetadata {
  target_planet_or_habitat: EnvironmentType;
  gravity_g: number;
  hazard_score_percentage: number;
  safety_status: HazardSafetyStatus;
}

export interface Visual3DTriggerParams {
  render_flame: boolean;
  flame_geometry_type: FlameGeometryType;
  flame_spread_velocity_mm_s: number;
  risk_color_hex: string;
  particle_explosion_density: number;
  warning_flash_ui: boolean;
}

export interface PhysicsEngineResponse {
  success: boolean;
  simulation_metadata: SimulationMetadata;
  visual_3d_trigger_params: Visual3DTriggerParams;
  scientific_explanation: string;
}

