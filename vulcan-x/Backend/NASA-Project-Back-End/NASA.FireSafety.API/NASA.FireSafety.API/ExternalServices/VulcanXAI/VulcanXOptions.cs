using System.ComponentModel.DataAnnotations;

namespace VulcanX.Infrastructure.ExternalServices.VulcanXAI;

public sealed class VulcanXOptions
{
    public const string SectionName = "VulcanX";

    [Required]
    [Url]
    public string BaseUrl { get; set; } = "http://localhost:4000";

    [Range(1, 120)]
    public int TimeoutSeconds { get; set; } = 60;
}
