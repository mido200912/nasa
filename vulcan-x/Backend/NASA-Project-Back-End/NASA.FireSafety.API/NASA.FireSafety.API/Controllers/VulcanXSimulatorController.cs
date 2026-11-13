using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using NASA.FireSafety.API.Services;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Requests;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Responses;

namespace NASA.FireSafety.API.Controllers;

[Route("api/v1/simulator")]
public sealed class VulcanXSimulatorController : VulcanXControllerBase
{
    private readonly IVulcanXAiClient _client;
    private readonly IOptions<HabitatSubmissionOptions> _submission;

    public VulcanXSimulatorController(IVulcanXAiClient client, IOptions<HabitatSubmissionOptions> submission)
    {
        _client = client;
        _submission = submission;
    }

    [HttpPost("stress-test")]
    [ProducesResponseType(typeof(StressTestResponse), StatusCodes.Status200OK)]
    public Task<ActionResult<StressTestResponse>> StressTest([FromBody] StressTestRequest request, CancellationToken cancellationToken) =>
        !_submission.Value.Enabled
            ? Task.FromResult<ActionResult<StressTestResponse>>(ScientificGate())
            : ExecuteAsync(() => _client.RunStressTestAsync(request, cancellationToken));

    [HttpPost("hazard-evaluation")]
    [ProducesResponseType(typeof(HazardEvaluationResponse), StatusCodes.Status200OK)]
    public Task<ActionResult<HazardEvaluationResponse>> HazardEvaluation([FromBody] HazardEvaluationRequest request, CancellationToken cancellationToken) =>
        !_submission.Value.Enabled
            ? Task.FromResult<ActionResult<HazardEvaluationResponse>>(ScientificGate())
            : ExecuteAsync(() => _client.EvaluateHazardAsync(request, cancellationToken));

    private ObjectResult ScientificGate()
    {
        var problem = new ProblemDetails { Status = 422, Title = "Live scientific simulation is disabled", Detail = "An approved scientific fixture and validated adapter are required; legacy formulas are not scientific validation." };
        problem.Extensions["errorCode"] = "HABITAT_FIXTURE_NOT_APPROVED";
        problem.Extensions["traceId"] = HttpContext.TraceIdentifier;
        return StatusCode(422, problem);
    }
}
