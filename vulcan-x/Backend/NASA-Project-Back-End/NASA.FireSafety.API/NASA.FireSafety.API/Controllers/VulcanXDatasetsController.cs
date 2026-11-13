using Microsoft.AspNetCore.Mvc;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Responses;

namespace NASA.FireSafety.API.Controllers;

[Route("api/v1/datasets")]
public sealed class VulcanXDatasetsController : VulcanXControllerBase
{
    private readonly IVulcanXAiClient _client;

    public VulcanXDatasetsController(IVulcanXAiClient client) => _client = client;

    [HttpGet]
    [ProducesResponseType(typeof(DatasetCatalogResponse), StatusCodes.Status200OK)]
    public Task<ActionResult<DatasetCatalogResponse>> GetDatasets(CancellationToken cancellationToken) =>
        ExecuteAsync(() => _client.GetDatasetsAsync(cancellationToken));
}
