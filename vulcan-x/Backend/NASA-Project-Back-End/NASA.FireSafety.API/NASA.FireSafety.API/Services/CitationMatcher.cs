using NASA.FireSafety.API.Entities;

namespace NASA.FireSafety.API.Services;

internal static class CitationMatcher
{
    internal static ResearchSource? Match(IReadOnlyList<ResearchSource> approvedSources, string reference)
    {
        var url = NormalizeUrl(reference);
        var matches = approvedSources.Where(source => url is not null
            ? NormalizeUrl(source.SourceUrl) == url
            : Normalize(source.Title) == Normalize(reference)).Take(2).ToArray();
        // A URL or title shared by multiple records is ambiguous, not verified.
        return matches.Length == 1 ? matches[0] : null;
    }

    internal static string? NormalizeUrl(string? value) =>
        Uri.TryCreate(value?.Trim(), UriKind.Absolute, out var uri)
        && uri.Scheme is "https" or "http" && string.IsNullOrEmpty(uri.UserInfo)
            ? uri.GetLeftPart(UriPartial.Path) + uri.Query
            : null;

    internal static string Normalize(string value) => string.Join(' ', value.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).ToUpperInvariant();
}
