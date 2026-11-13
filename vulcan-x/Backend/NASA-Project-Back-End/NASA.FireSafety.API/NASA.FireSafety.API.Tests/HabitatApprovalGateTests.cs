using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace NASA.FireSafety.API.Tests;

public sealed class HabitatApprovalGateTests
{
    [Fact]
    public async Task UnapprovedLiveSubmissionIsRejectedBeforeAnyDatabaseOrAiCall()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder
            .UseEnvironment("Production")
            .ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            { ["ConnectionStrings:FireSafetyDb"] = "Server=127.0.0.1,59997;Database=UnavailableTestOnly;Integrated Security=True;Connect Timeout=1" })));
        using var client = factory.CreateClient();
        // IDs are technical validation fixtures, not scientific input defaults.
        var response = await client.PostAsJsonAsync("/api/habitat-analyses", new { environmentId = 1, materialId = 1 });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Contains("HABITAT_FIXTURE_NOT_APPROVED", await response.Content.ReadAsStringAsync());
    }
}
