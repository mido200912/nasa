using System.Text.Json.Serialization;

namespace VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Responses;

public sealed class StressTestResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("simulation_result")]
    public StressTestResult SimulationResult { get; set; } = new();
}

public sealed class StressTestResult
{
    [JsonPropertyName("ignition_speed_multiplier")]
    public double IgnitionSpeedMultiplier { get; set; }

    [JsonPropertyName("safety_status")]
    public string SafetyStatus { get; set; } = string.Empty;

    [JsonPropertyName("recommendation")]
    public string Recommendation { get; set; } = string.Empty;
}