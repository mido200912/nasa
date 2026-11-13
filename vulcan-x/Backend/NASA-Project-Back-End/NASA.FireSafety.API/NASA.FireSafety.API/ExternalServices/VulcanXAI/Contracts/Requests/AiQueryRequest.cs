using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Requests;

public sealed class AiQueryRequest
{
    [Required]
    [MinLength(1)]
    [MaxLength(2000)]
    [JsonPropertyName("question")]
    public string Question { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(lunar_base|mars_rover|iss|earth)$")]
    [JsonPropertyName("environment")]
    public string Environment { get; set; } = string.Empty;
}
