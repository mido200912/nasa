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
    public async Task CapabilitiesReportTheClosedGateWithoutExposingApprovalReferences()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder
            .UseEnvironment("Production")
            .ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:FireSafetyDb"] = "Server=127.0.0.1,59997;Database=UnavailableTestOnly;Integrated Security=True;Connect Timeout=1",
                 ["HabitatSubmission:Enabled"] = "false",
                 ["HabitatSubmission:InterpretationEnabled"] = "false",
                ["HabitatSubmission:ApprovedFixtureReference"] = "private-approval-document"
            })));
        using var client = factory.CreateClient();
        var response = await client.GetAsync("/api/habitat-analyses/capabilities");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var text = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"enabled\":false", text);
        Assert.DoesNotContain("private-approval-document", text);
    }

    [Fact]
    public async Task DisabledInterpretationIsRejectedBeforeAnyDatabaseOrAiCall()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder
            .UseEnvironment("Production")
            .ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            { ["ConnectionStrings:FireSafetyDb"] = "Server=127.0.0.1,59997;Database=UnavailableTestOnly;Integrated Security=True;Connect Timeout=1",
              ["HabitatSubmission:InterpretationEnabled"] = "false" })));
        using var client = factory.CreateClient();
        // IDs are technical validation fixtures, not scientific input defaults.
        var response = await client.PostAsJsonAsync("/api/habitat-analyses", new { environmentId = 1, materialId = 1 });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Contains("HABITAT_INTERPRETATION_DISABLED", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task InterpretationDoesNotRequireOrUnlockScientificSimulationApproval()
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder
            .UseEnvironment("Production")
            .ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:FireSafetyDb"] = "Server=127.0.0.1,59997;Database=UnavailableTestOnly;Integrated Security=True;Connect Timeout=1",
                ["HabitatSubmission:InterpretationEnabled"] = "true",
                ["HabitatSubmission:Enabled"] = "false",
                ["HabitatSubmission:ApprovedFixtureReference"] = ""
            })));
        using var client = factory.CreateClient();
        var response = await client.GetAsync("/api/habitat-analyses/capabilities");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("\"enabled\":true", await response.Content.ReadAsStringAsync());
        var legacy = await client.PostAsJsonAsync("/api/v1/simulator/stress-test",
            new { habitat = "iss", oxygen_concentration = 21, pressure_psi = 14.7, material_type = "technical fixture" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, legacy.StatusCode);
    }
}
