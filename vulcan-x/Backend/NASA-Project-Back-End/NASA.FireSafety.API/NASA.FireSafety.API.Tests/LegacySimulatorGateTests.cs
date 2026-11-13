using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using NASA.FireSafety.API.Controllers;
using NASA.FireSafety.API.Services;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;
using Xunit;

namespace NASA.FireSafety.API.Tests;

public sealed class LegacySimulatorGateTests
{
    [Fact]
    public async Task RawSimulatorRoutesCannotBypassDisabledScientificSubmissionGate()
    {
        // No scientific inputs and no upstream client: gate must reject before any calculation.
        var controller = new VulcanXSimulatorController(null!, Options.Create(new HabitatSubmissionOptions()))
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        var stress = Assert.IsType<ObjectResult>((await controller.StressTest(new(), CancellationToken.None)).Result);
        var hazard = Assert.IsType<ObjectResult>((await controller.HazardEvaluation(new(), CancellationToken.None)).Result);
        foreach (var result in new[] { stress, hazard })
        {
            Assert.Equal(422, result.StatusCode);
            Assert.Equal("HABITAT_FIXTURE_NOT_APPROVED", Assert.IsType<ProblemDetails>(result.Value).Extensions["errorCode"]);
        }
    }
}
