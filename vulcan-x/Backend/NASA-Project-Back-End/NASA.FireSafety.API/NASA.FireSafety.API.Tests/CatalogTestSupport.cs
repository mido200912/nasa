using Microsoft.EntityFrameworkCore;
using NASA.FireSafety.API.Data;

namespace NASA.FireSafety.API.Tests;

internal static class CatalogTestSupport
{
    internal static FireSafetyDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<FireSafetyDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;
        return new FireSafetyDbContext(options);
    }
}
