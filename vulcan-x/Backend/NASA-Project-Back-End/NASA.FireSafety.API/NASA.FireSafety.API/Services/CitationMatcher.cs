using Microsoft.EntityFrameworkCore;
using NASA.FireSafety.API.Data;
using NASA.FireSafety.API.Entities;

namespace NASA.FireSafety.API.Services;

internal static class CitationMatcher
{
    internal static async Task<ResearchSource?> MatchExactTitleAsync(FireSafetyDbContext dbContext, string rawTitle, CancellationToken cancellationToken)
    {
        var normalized = Normalize(rawTitle);
        if (normalized.Length == 0) return null;
        var sources = await dbContext.ResearchSources.AsNoTracking()
            .Where(x => x.CurationStatus == CurationStatus.ApprovedForDisplay)
            .ToListAsync(cancellationToken);
        return sources.SingleOrDefault(x => Normalize(x.Title) == normalized);
    }

    internal static string Normalize(string value) => string.Join(' ', value.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).ToUpperInvariant();
}
