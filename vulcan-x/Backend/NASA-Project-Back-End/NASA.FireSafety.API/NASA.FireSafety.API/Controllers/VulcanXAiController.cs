using Microsoft.AspNetCore.Mvc;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Requests;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Responses;

namespace NASA.FireSafety.API.Controllers;

[Route("api/v1/ai")]
public sealed class VulcanXAiController : VulcanXControllerBase
{
    private readonly IVulcanXAiClient _client;

    public VulcanXAiController(IVulcanXAiClient client) => _client = client;

    [HttpPost("query")]
    [ProducesResponseType(typeof(AiQueryResponse), StatusCodes.Status200OK)]
    public Task<ActionResult<AiQueryResponse>> Query([FromBody] AiQueryRequest request, CancellationToken cancellationToken) =>
        ExecuteAsync(() => _client.QueryAsync(request, cancellationToken));

    [HttpGet("health")]
    [ProducesResponseType(typeof(VulcanXHealthResponse), StatusCodes.Status200OK)]
    public Task<ActionResult<VulcanXHealthResponse>> Health(CancellationToken cancellationToken) =>
        ExecuteAsync(() => _client.GetHealthAsync(cancellationToken));
}
