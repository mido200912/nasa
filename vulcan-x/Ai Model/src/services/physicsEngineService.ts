import type {
  EnvironmentType,
  HazardSafetyStatus,
  FlameGeometryType,
  PhysicsEngineRequest,
  PhysicsEngineResponse,
  SimulationMetadata,
  Visual3DTriggerParams,
} from '../types';
import type { AiProviderService } from './aiProviderService';

export class PhysicsEngineService {
  private aiProvider?: AiProviderService;

  constructor(aiProvider?: AiProviderService) {
    this.aiProvider = aiProvider;
  }

  /**
   * Evaluates planetary & habitat fire hazards based on NASA PSI empirical data
   * and generates precise 3D rendering parameters + scientific explanation.
   */
  public async evaluateHazard(request: PhysicsEngineRequest, signal?: AbortSignal): Promise<PhysicsEngineResponse> {
    signal?.throwIfAborted();
    const { target_planet_or_habitat, oxygen_concentration, pressure_psi, material_type } = request;

    // 1. Planetary & habitat physics constants
    const planetaryData: Record<
      EnvironmentType,
      {
        gravity_g: number;
        baseVelocity: number;
        flameGeometry: FlameGeometryType;
        name: string;
      }
    > = {
      lunar_base: {
        gravity_g: 0.166,
        baseVelocity: 4.0,
        flameGeometry: 'spherical_blue_core',
        name: 'Lunar Base Habitat',
      },
      mars_rover: {
        gravity_g: 0.38,
        baseVelocity: 2.8,
        flameGeometry: 'hemispherical_spread',
        name: 'Mars Habitat / Surface Cabin',
      },
      iss: {
        gravity_g: 0.0,
        baseVelocity: 3.2,
        flameGeometry: 'ventilation_driven_trail',
        name: 'ISS Microgravity Module',
      },
      earth: {
        gravity_g: 1.0,
        baseVelocity: 1.8,
        flameGeometry: 'buoyant_plume',
        name: 'Earth 1g Ground Facility',
      },
    };

    const planet = planetaryData[target_planet_or_habitat] || planetaryData.lunar_base;
    const gravity_g = planet.gravity_g;

    // 2. Material Combustibility Index (NASA-STD-6001B empirical test data)
    const materialIndex = this.getMaterialCombustibility(material_type);

    // 3. Environmental Scaling Calculations
    // Clamp O2 to [12% - 65%]
    const clampedO2 = Math.max(12.0, Math.min(65.0, oxygen_concentration));
    // Saffire & BASS observation: flame spread velocity exponent scales sharply with O2 mole fraction
    const o2Multiplier = Math.pow(clampedO2 / 20.95, 1.7);

    // Pressure factor: exploration atmospheres (8.2 to 10.2 psi) increase gas diffusivity
    const clampedPressure = Math.max(4.0, Math.min(22.0, pressure_psi));
    const pressureMultiplier = Math.pow(14.7 / clampedPressure, 0.25);

    // Microgravity/Low-gravity flame expansion factor
    // Low gravity suppresses buoyant heat dissipation, creating thicker thermal boundary layers
    let gravitySpreadFactor = 1.0;
    if (gravity_g === 0.0) {
      gravitySpreadFactor = 1.35; // zero-g airflow driven
    } else if (gravity_g < 0.2) {
      gravitySpreadFactor = 1.45; // lunar 0.166g: near peak spread regime
    } else if (gravity_g < 0.5) {
      gravitySpreadFactor = 1.2; // mars 0.38g
    }

    // 4. Calculate Flame Spread Velocity (mm/s)
    let spreadVelocity = planet.baseVelocity * materialIndex.flammabilityFactor * o2Multiplier * pressureMultiplier * (gravitySpreadFactor / 1.25);
    spreadVelocity = Number(Math.max(0.1, spreadVelocity).toFixed(1));

    // 5. Compute Normalized Hazard Score Percentage (0 - 100%)
    // Base hazard derived from O2 enrichment, material index, and flame spread velocity
    let rawHazard = (spreadVelocity / 6.5) * 55 + (clampedO2 / 40.0) * 30 + (materialIndex.flammabilityFactor / 1.8) * 15;
    
    // Additional habitat penalty for high O2 habitats (Lunar Base 30-34% O2)
    if (target_planet_or_habitat === 'lunar_base' && clampedO2 >= 30.0) {
      rawHazard *= 1.18; // 40% faster baseline spread / heightened risk
    } else if (target_planet_or_habitat === 'iss' && clampedO2 > 23.5) {
      rawHazard *= 1.25;
    }

    const hazard_score_percentage = Number(Math.min(99.9, Math.max(5.0, rawHazard)).toFixed(1));

    // 6. Safety Status Classification
    let safety_status: HazardSafetyStatus = 'NOMINAL';
    let risk_color_hex = '#10B981'; // Green
    let particle_explosion_density = 120;
    let warning_flash_ui = false;
    let render_flame = true;

    if (materialIndex.flammabilityFactor <= 0.25 && clampedO2 < 25.0) {
      render_flame = false;
    }

    if (hazard_score_percentage >= 75.0 || clampedO2 >= 32.0 || (materialIndex.flammabilityFactor >= 1.4 && clampedO2 >= 28.0)) {
      safety_status = 'CRITICAL_HAZARD';
      risk_color_hex = '#FF3333';
      particle_explosion_density = Math.round(1000 + (hazard_score_percentage - 75) * 25);
      warning_flash_ui = true;
    } else if (hazard_score_percentage >= 45.0 || clampedO2 > 23.5) {
      safety_status = 'ELEVATED_RISK';
      risk_color_hex = '#F59E0B';
      particle_explosion_density = Math.round(400 + (hazard_score_percentage - 45) * 15);
      warning_flash_ui = false;
    } else {
      safety_status = 'NOMINAL';
      risk_color_hex = '#10B981';
      particle_explosion_density = Math.round(hazard_score_percentage * 3);
      warning_flash_ui = false;
    }

    // Geometry type override based on material/combustion mode
    let flame_geometry_type = planet.flameGeometry;
    if (!render_flame) {
      flame_geometry_type = 'none';
    } else if (material_type.toLowerCase().includes('cotton') && clampedO2 < 24.0) {
      flame_geometry_type = 'smoldering_surface';
    } else if (target_planet_or_habitat === 'iss' && material_type.toLowerCase().includes('droplet')) {
      flame_geometry_type = 'micro_droplet_cool_flame';
    }

    const simulation_metadata: SimulationMetadata = {
      target_planet_or_habitat,
      gravity_g,
      hazard_score_percentage,
      safety_status,
    };

    const visual_3d_trigger_params: Visual3DTriggerParams = {
      render_flame,
      flame_geometry_type,
      flame_spread_velocity_mm_s: spreadVelocity,
      risk_color_hex,
      particle_explosion_density,
      warning_flash_ui,
    };

    // 7. Scientific Explanation Generation (Deterministic Base + AI Enrichment)
    const baseExplanation = this.buildDeterministicScientificExplanation(
      target_planet_or_habitat,
      gravity_g,
      clampedO2,
      clampedPressure,
      material_type,
      flame_geometry_type,
      safety_status,
      spreadVelocity
    );

    let scientific_explanation = baseExplanation;

    if (this.aiProvider) {
      try {
        const systemPrompt =
          `You are the Vulcan-X NASA Space Apps senior combustion physicist and microgravity 3D visualization engineer.\n` +
          `Generate a one to two-sentence concise, authoritative, peer-reviewed scientific explanation for the 3D flame simulator.\n` +
          `Synthesize NASA PSI research (BASS, Saffire, ACME, FLEX investigations).\n` +
          `Explicitly cite gravity (${gravity_g}g), oxygen concentration (${clampedO2}%), material behavior (${material_type}), and flame geometry (${flame_geometry_type}).\n` +
          `Strictly keep the response under 45 words. Zero fluff.`;

        const userPrompt =
          `Habitat: ${planet.name} (${gravity_g}g)\n` +
          `Oxygen: ${clampedO2}%\n` +
          `Pressure: ${clampedPressure} psi\n` +
          `Material: ${material_type}\n` +
          `Velocity: ${spreadVelocity} mm/s\n` +
          `Safety Status: ${safety_status}\n` +
          `Visual Flame Geometry: ${flame_geometry_type}\n\n` +
          `Output the scientific explanation sentence:`;

        // Abort the actual provider work, rather than leaving the losing race running.
        const explanationSignal = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(8000)]);
        const aiRes = await this.aiProvider.generateCompletion(userPrompt, systemPrompt, explanationSignal);

        if (aiRes?.text && aiRes.text.trim().length > 25) {
          scientific_explanation = aiRes.text.trim().replace(/^["']|["']$/g, '');
        }
      } catch (err: any) {
        signal?.throwIfAborted();
        console.warn('[PhysicsEngineService] Provider unavailable; retaining deterministic baseline');
      }
    }

    return {
      success: true,
      simulation_metadata,
      visual_3d_trigger_params,
      scientific_explanation,
    };
  }

  /**
   * Combustibility and flammability parameters based on NASA-STD-6001B
   */
  private getMaterialCombustibility(material: string): { flammabilityFactor: number; description: string } {
    const mat = material.toLowerCase().trim();

    if (mat.includes('pmma') || mat.includes('acrylic') || mat.includes('plexiglass')) {
      return { flammabilityFactor: 1.85, description: 'PMMA acrylic thermoplastic' };
    }
    if (mat.includes('cotton') || mat.includes('cellulose') || mat.includes('fabric')) {
      return { flammabilityFactor: 1.5, description: 'Cellulose cotton weave' };
    }
    if (mat.includes('delrin') || mat.includes('pom') || mat.includes('polyoxymethylene')) {
      return { flammabilityFactor: 1.75, description: 'Polyacetal POM' };
    }
    if (mat.includes('polyethylene') || mat.includes('pe') || mat.includes('polypropylene')) {
      return { flammabilityFactor: 1.45, description: 'Polyolefin polymer' };
    }
    if (mat.includes('silicone') || mat.includes('rubber')) {
      return { flammabilityFactor: 1.3, description: 'Silicone elastomer' };
    }
    if (mat.includes('polycarbonate') || mat.includes('lexan')) {
      return { flammabilityFactor: 0.9, description: 'Polycarbonate sheet' };
    }
    if (mat.includes('nomex') || mat.includes('aramid') || mat.includes('kevlar')) {
      return { flammabilityFactor: 0.38, description: 'Flame-retardant aramid fiber' };
    }
    if (mat.includes('kapton') || mat.includes('polyimide')) {
      return { flammabilityFactor: 0.3, description: 'Polyimide aerospace film' };
    }
    if (mat.includes('teflon') || mat.includes('ptfe')) {
      return { flammabilityFactor: 0.18, description: 'PTFE fluoropolymer' };
    }
    if (mat.includes('titanium') || mat.includes('aluminum') || mat.includes('metal')) {
      return { flammabilityFactor: 0.05, description: 'Aerospace structural alloy' };
    }

    return { flammabilityFactor: 1.0, description: 'Standard combustible solid' };
  }

  /**
   * Deterministic explanation matching NASA PSI literature
   */
  private buildDeterministicScientificExplanation(
    habitat: EnvironmentType,
    gravity_g: number,
    o2: number,
    pressure: number,
    material: string,
    geometry: FlameGeometryType,
    status: HazardSafetyStatus,
    velocity: number
  ): string {
    if (habitat === 'lunar_base') {
      return `In a lunar habitat environment with ${o2}% oxygen and ${gravity_g}g gravity, ${material} exhibits rapid spherical flame propagation without buoyant plume detachment, drastically increasing localized thermal buildup.`;
    }
    if (habitat === 'iss') {
      return `Under microgravity (0g) conditions aboard ISS, absent buoyant convection causes flame spread on ${material} to rely exclusively on forced ventilation airflow, producing elongated cylindrical boundary flames.`;
    }
    if (habitat === 'mars_rover') {
      return `In a Mars surface habitat with ${gravity_g}g gravity and ${pressure} psi atmospheric pressure, ${material} combustion forms hemispherical reaction zones where oxygen leakage triggers localized acceleration.`;
    }
    return `In an Earth 1g facility with ${o2}% oxygen, buoyant upward thermal plume convection dominates flame propagation on ${material} at ${velocity} mm/s spread velocity.`;
  }
}
