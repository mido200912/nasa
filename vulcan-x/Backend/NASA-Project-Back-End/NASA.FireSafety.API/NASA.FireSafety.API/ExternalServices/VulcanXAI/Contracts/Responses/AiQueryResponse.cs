using System.Text.Json.Serialization;

namespace VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Responses;

public sealed class AiQueryResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("answer")]
    public string Answer { get; set; } = string.Empty;

    [JsonPropertyName("sources")]
    public List<string> Sources { get; set; } = [];

    [JsonPropertyName("risk_level")]
    public string RiskLevel { get; set; } = string.Empty;
}