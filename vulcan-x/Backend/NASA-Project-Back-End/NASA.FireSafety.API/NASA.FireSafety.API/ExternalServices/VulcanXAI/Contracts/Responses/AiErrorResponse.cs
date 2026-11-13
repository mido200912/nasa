using System.Text.Json.Serialization;

namespace VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Responses;

public sealed class AiErrorResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("error")]
    public string Error { get; set; } = string.Empty;

    [JsonPropertyName("details")]
    public List<string>? Details { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}