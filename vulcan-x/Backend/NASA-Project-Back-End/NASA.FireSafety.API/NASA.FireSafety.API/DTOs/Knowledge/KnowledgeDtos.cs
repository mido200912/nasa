using System.ComponentModel.DataAnnotations;
using NASA.FireSafety.API.DTOs.Habitat;

namespace NASA.FireSafety.API.DTOs.Knowledge;

public sealed class CreateKnowledgeQueryRequest
{
    [Required, MinLength(3), MaxLength(2000)] public string Question { get; init; } = string.Empty;
    [Range(1, int.MaxValue)] public int EnvironmentId { get; init; }
    [Range(1, int.MaxValue)] public int? MaterialId { get; init; }
    [Range(1950, 2100)] public int? YearFrom { get; init; }
    [Range(1950, 2100)] public int? YearTo { get; init; }
    [Range(1, 10)] public int MaxSources { get; init; } = 5;
    [MaxLength(10)] public string? Language { get; init; }
}

public sealed record KnowledgeQueryResponseDto(Guid Id, string Status, string Question, string? Answer, string? GroundingStatus, bool IsMock, IReadOnlyList<KnowledgeCitationDto> Citations, KnowledgeErrorDto? Error, string Disclaimer);
public sealed record KnowledgeCitationDto(string MatchStatus, SourceReferenceDto? Source, string? RawTitle, string? RawUrl, string? Excerpt, decimal? RelevanceScore);
public sealed record KnowledgeErrorDto(string? Code, string? Message);
