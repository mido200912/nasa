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
  risk_level: RiskLevel;
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

export interface RagDocument {
  id: string;
  investigation: string; // e.g. "BASS", "Saffire-I", "ACME", "FLEX-2", "CFI"
  title: string;
  description: string;
  keywords: string[];
  environment: EnvironmentType[];
  findings: string;
  citation: string;
  gravity_condition: string; // e.g. "Microgravity (0g)", "Lunar (0.166g)", "Mars (0.38g)"
  fire_safety_implication: string;
}

export interface SearchResult {
  doc: RagDocument;
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

