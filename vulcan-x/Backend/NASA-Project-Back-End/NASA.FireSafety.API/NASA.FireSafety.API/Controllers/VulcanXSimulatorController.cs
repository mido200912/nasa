using Microsoft.AspNetCore.Mvc;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Requests;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Responses;

namespace NASA.FireSafety.API.Controllers;

[Route("api/v1/simulator")]
public sealed class VulcanXSimulatorController : VulcanXControllerBase
{
    private readonly IVulcanXAiClient _client;

    public VulcanXSimulatorController(IVulcanXAiClient client) => _client = client;

    [HttpPost("stress-test")]
    [ProducesResponseType(typeof(StressTestResponse), StatusCodes.Status200OK)]
    public Task<ActionResult<StressTestResponse>> StressTest([FromBody] StressTestRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync(() => _client.RunStressTestAsync(request, cancellationToken));

    [HttpPost("hazard-evaluation")]
    [ProducesResponseType(typeof(HazardEvaluationResponse), StatusCodes.Status200OK)]
    public Task<ActionResult<HazardEvaluationResponse>> HazardEvaluation([FromBody] HazardEvaluationRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync(() => _client.EvaluateHazardAsync(request, cancellationToken));
}
