import type { HabitatType, SafetyStatus, SimulationResult, StressTestRequest } from '../types';
import type { AiProviderService } from './aiProviderService';

export class PhysicsSimulatorService {
  private aiProvider?: AiProviderService;

  constructor(aiProvider?: AiProviderService) {
    this.aiProvider = aiProvider;
  }

  /**
   * Evaluates habitat atmospheric and material combustion risk based on NASA PSI empirical models
   * and enriches recommendations using the OpenRouter AI Engine.
   */
  public async simulate(request: StressTestRequest, signal?: AbortSignal): Promise<SimulationResult> {
    signal?.throwIfAborted();
    const { habitat, oxygen_concentration, pressure_psi, material_type } = request;

    // 1. Environmental gravity factor (NASA BASS/Saffire findings)
    const gravityFactors: Record<HabitatType, { factor: number; desc: string }> = {
      lunar: { factor: 1.25, desc: 'Lunar gravity (0.166g) - Peak flame spread regime due to gentle buoyant replenishment' },
      iss: { factor: 1.15, desc: 'Microgravity (0g) with forced ventilation (0.05-0.15 m/s)' },
      mars: { factor: 1.08, desc: 'Mars gravity (0.38g) with moderate buoyant convection' },
    };
    const envInfo = gravityFactors[habitat] || { factor: 1.15, desc: 'Space habitat microgravity' };
    const cGravity = envInfo.factor;

    // 2. Material flammability coefficient (NASA-STD-6001B empirical test database)
    const materialCoeff = this.getMaterialCoefficient(material_type);

    // 3. Oxygen partial pressure and mole fraction scaling
    // Saffire data: flame spread velocity scales with (Y_O2 / 0.21)^1.65
    const baselineO2 = 20.95;
    const clampedO2 = Math.max(12.0, Math.min(60.0, oxygen_concentration));
    const o2Factor = Math.pow(clampedO2 / baselineO2, 1.65);

    // 4. Pressure scaling factor
    // NASA exploration atmospheres (8.2 to 10.2 psi) increase gas diffusivity
    const baselinePressure = 14.7; // psi
    const clampedPressure = Math.max(4.0, Math.min(20.0, pressure_psi));
    const pressureFactor = Math.pow(baselinePressure / clampedPressure, 0.22);

    // 5. Calculate combined ignition & flame spread speed multiplier
    const rawMultiplier = materialCoeff * o2Factor * pressureFactor * cGravity;
    const ignition_speed_multiplier = Number(Math.max(0.05, rawMultiplier).toFixed(2));

    // 6. Safety Status classification
    let safety_status: SafetyStatus = 'Safe';
    if (
      ignition_speed_multiplier >= 2.2 ||
      clampedO2 >= 34.0 ||
      (materialCoeff >= 1.4 && clampedO2 >= 28.0)
    ) {
      safety_status = 'Critical';
    } else if (
      ignition_speed_multiplier >= 1.05 ||
      clampedO2 > 23.5 ||
      (materialCoeff >= 1.2 && ignition_speed_multiplier >= 0.95)
    ) {
      safety_status = 'Warning';
    } else {
      safety_status = 'Safe';
    }

    // 7. Base deterministic recommendation (used as fallback)
    const baseRecommendation = this.buildDeterministicRecommendation(
      habitat,
      clampedO2,
      clampedPressure,
      material_type,
      ignition_speed_multiplier,
      safety_status
    );

    // 8. Enrich recommendation using OpenRouter AI Engine
    let finalRecommendation = baseRecommendation;

    if (this.aiProvider) {
      try {
        const habitatLabel = habitat === 'lunar' ? 'Lunar Base' : habitat === 'mars' ? 'Mars Habitat/Rover' : 'ISS Module';
        const systemPrompt =
          `You are the Vulcan-X NASA Space Apps Senior AI Fire Safety & Combustion Engineer.\n` +
          `Analyze the following space habitat simulation stress-test results derived from NASA PSI models (BASS, Saffire, NASA-STD-6001B).\n` +
          `Provide an authoritative, concise, and highly actionable engineering recommendation.\n` +
          `Include:\n` +
          `1. Evaluation of the ${ignition_speed_multiplier}x ignition multiplier and ${safety_status} status.\n` +
          `2. Material suitability of '${material_type}' under ${clampedO2}% O2 at ${clampedPressure} psi.\n` +
          `3. Concrete aerospace protocol steps (ventilation cutoff, N2 dilution/water mist, or material replacement).\n` +
          `Keep the response under 100 words. Strictly technical, no fluff.`;

        const userPrompt =
          `Habitat: ${habitatLabel} (${envInfo.desc})\n` +
          `Oxygen Concentration: ${clampedO2}%\n` +
          `Ambient Pressure: ${clampedPressure} psi\n` +
          `Material: ${material_type} (Flammability Index: ${materialCoeff})\n` +
          `Calculated Ignition Multiplier: ${ignition_speed_multiplier}x (vs Earth 1g)\n` +
          `Safety Status: ${safety_status.toUpperCase()}\n\n` +
          `Generate the official Vulcan-X AI Engineering Protocol Recommendation:`;

        const aiResponse = await this.aiProvider.generateCompletion(userPrompt, systemPrompt, signal);
        if (aiResponse?.text && aiResponse.text.trim().length > 20) {
          finalRecommendation = aiResponse.text.trim();
        }
      } catch (err) {
        signal?.throwIfAborted();
        console.warn('[PhysicsSimulatorService] Provider unavailable; retaining deterministic baseline');
      }
    }

    return {
      ignition_speed_multiplier,
      safety_status,
      recommendation: finalRecommendation,
    };
  }

  /**
   * Matches material to NASA-STD-6001B flammability index
   */
  private getMaterialCoefficient(material: string): number {
    const mat = material.toLowerCase().trim();

    if (mat.includes('pmma') || mat.includes('acrylic') || mat.includes('plexiglass')) {
      return 1.85; // Highly combustible solid fuel
    }
    if (mat.includes('cotton') || mat.includes('cellulose') || mat.includes('fabric')) {
      return 1.50; // Readily flammable, high smoldering risk
    }
    if (mat.includes('delrin') || mat.includes('pom') || mat.includes('polyoxymethylene')) {
      return 1.75; // Severe flame propagation hazard
    }
    if (mat.includes('polyethylene') || mat.includes('pe') || mat.includes('polypropylene')) {
      return 1.45; // High melt dripping and flame acceleration
    }
    if (mat.includes('silicone') || mat.includes('rubber')) {
      return 1.30; // Vigorous burning in enriched oxygen
    }
    if (mat.includes('polycarbonate') || mat.includes('lexan')) {
      return 0.90; // Self-extinguishing at 21% O2, flammable >26% O2
    }
    if (mat.includes('nomex') || mat.includes('aramid') || mat.includes('kevlar')) {
      return 0.38; // Fire-retardant space suit outer layer
    }
    if (mat.includes('kapton') || mat.includes('polyimide')) {
      return 0.30; // Spacecraft thermal insulation standard
    }
    if (mat.includes('teflon') || mat.includes('ptfe')) {
      return 0.18; // Exceptional oxygen index (LOI > 95%)
    }
    if (mat.includes('titanium') || mat.includes('aluminum') || mat.includes('metal')) {
      return 0.05; // Structural metal baseline
    }

    return 1.0; // Standard nominal combustible
  }

  /**
   * Generates baseline deterministic recommendation
   */
  private buildDeterministicRecommendation(
    habitat: HabitatType,
    o2: number,
    pressure: number,
    material: string,
    multiplier: number,
    status: SafetyStatus
  ): string {
    const habitatName = habitat === 'lunar' ? 'Lunar Base' : habitat === 'mars' ? 'Mars Rover/Cabin' : 'ISS Module';

    if (status === 'Critical') {
      return (
        `CRITICAL COMBUSTION HAZARD in ${habitatName}: Flame spread multiplier is elevated to ${multiplier}x under ${o2}% O2 at ${pressure} psi. ` +
        `Material '${material}' exceeds NASA-STD-6001 Test 1 safety threshold for this atmosphere. ` +
        `Immediate Protocol: (1) Replace with Kapton, Nomex, or PTFE fluoropolymers. ` +
        `(2) Interlock cabin ventilation to automatically shut down within 5 seconds of smoke trigger to deprive oxidizer transport (NASA BASS protocol). ` +
        `(3) Arm rapid nitrogen dilution or fine water mist suppression system.`
      );
    }

    if (status === 'Warning') {
      return (
        `ELEVATED FIRE RISK in ${habitatName}: Combustion velocity multiplier is ${multiplier}x (${o2}% O2 at ${pressure} psi). ` +
        `Under low-gravity conditions, thermal boundary layer thickening increases downstream preheating. ` +
        `Recommended Countermeasures: (1) Recalibrate optical smoke sensors for microgravity particulate aggregation (NASA Saffire finding). ` +
        `(2) Ensure forced ventilation velocity remains below 0.05 m/s in electronics bays. ` +
        `(3) Verify secondary fire containment barriers around '${material}'.`
      );
    }

    return (
      `NOMINAL SAFETY STATUS in ${habitatName}: Multiplier is ${multiplier}x (${o2}% O2 at ${pressure} psi). ` +
      `Parameters satisfy NASA-STD-6001B baseline criteria for '${material}'. Maintain standard cabin circulation (0.08-0.12 m/s) and routine multi-gas sensor telemetry.`
    );
  }
}
