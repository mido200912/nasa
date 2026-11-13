using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Requests;

public sealed class StressTestRequest
{
    [Required]
    [RegularExpression("^(lunar|mars|iss)$")]
    [JsonPropertyName("habitat")]
    public string Habitat { get; set; } = string.Empty;

    [Range(0, 100)]
    [JsonPropertyName("oxygen_concentration")]
    public double OxygenConcentration { get; set; }

    [Range(typeof(double), "0.000001", "7922.816251426434")]
    [JsonPropertyName("pressure_psi")]
    public double PressurePsi { get; set; }

    [Required]
    [MaxLength(200)]
    [JsonPropertyName("material_type")]
    public string MaterialType { get; set; } = string.Empty;
}
