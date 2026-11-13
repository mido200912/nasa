using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace NASA.FireSafety.API.Data;

public sealed class FireSafetyDbContextFactory : IDesignTimeDbContextFactory<FireSafetyDbContext>
{
    public FireSafetyDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__FireSafetyDb");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Set ConnectionStrings__FireSafetyDb before creating EF Core migrations.");
        }

        return new FireSafetyDbContext(new DbContextOptionsBuilder<FireSafetyDbContext>()
            .UseSqlServer(connectionString, sql => sql.MigrationsAssembly(typeof(FireSafetyDbContext).Assembly.FullName))
            .Options);
    }
}
