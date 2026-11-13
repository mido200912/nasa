using System.Text.Json.Serialization;

namespace VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Responses;

public sealed class HazardEvaluationResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("simulation_metadata")]
    public SimulationMetadata SimulationMetadata { get; set; } = new();

    [JsonPropertyName("visual_3d_trigger_params")]
    public Visual3DTriggerParams Visual3DTriggerParams { get; set; } = new();

    [JsonPropertyName("scientific_explanation")]
    public string ScientificExplanation { get; set; } = string.Empty;
}

public sealed class SimulationMetadata
{
    [JsonPropertyName("target_planet_or_habitat")]
    public string TargetPlanetOrHabitat { get; set; } = string.Empty;

    [JsonPropertyName("gravity_g")]
    public double GravityG { get; set; }

    [JsonPropertyName("hazard_score_percentage")]
    public double HazardScorePercentage { get; set; }

    [JsonPropertyName("safety_status")]
    public string SafetyStatus { get; set; } = string.Empty;
}

public sealed class Visual3DTriggerParams
{
    [JsonPropertyName("render_flame")]
    public bool RenderFlame { get; set; }

    [JsonPropertyName("flame_geometry_type")]
    public string FlameGeometryType { get; set; } = string.Empty;

    [JsonPropertyName("flame_spread_velocity_mm_s")]
    public double FlameSpreadVelocityMmS { get; set; }

    [JsonPropertyName("risk_color_hex")]
    public string RiskColorHex { get; set; } = string.Empty;

    [JsonPropertyName("particle_explosion_density")]
    public int ParticleExplosionDensity { get; set; }

    [JsonPropertyName("warning_flash_ui")]
    public bool WarningFlashUi { get; set; }
}