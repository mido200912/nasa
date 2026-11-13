using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using NASA.FireSafety.API.DTOs.Habitat;
using NASA.FireSafety.API.Interfaces;
using NASA.FireSafety.API.Services;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;

namespace NASA.FireSafety.API.Controllers;

[ApiController, Route("api/habitat-analyses")]
public sealed class HabitatAnalysesController(IHabitatAnalysisService service, IOptions<HabitatSubmissionOptions> submission) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<HabitatAnalysisResponseDto>> Create([FromBody] CreateHabitatAnalysisRequest request, CancellationToken cancellationToken)
    {
        if (!submission.Value.Enabled)
            return Problem(StatusCodes.Status422UnprocessableEntity, "Live Habitat submission is disabled", "A science-team-approved scientific fixture is required before live submission can be enabled.", "HABITAT_FIXTURE_NOT_APPROVED");
        try { return StatusCode(StatusCodes.Status201Created, await service.CreateAsync(request, cancellationToken)); }
        catch (CatalogRecordNotFoundException exception) { return Problem(StatusCodes.Status404NotFound, "Catalog record was not found", exception.Resource, "CATALOG_NOT_FOUND"); }
        catch (ScientificInputRequiredException exception) { return Problem(StatusCodes.Status422UnprocessableEntity, "Required scientific input is missing", exception.Message, "AI_REQUIRED_INPUT_MISSING"); }
        catch (InvalidRequestException exception) { return Problem(StatusCodes.Status400BadRequest, "Invalid habitat analysis request", exception.Message, "HABITAT_INVALID_REQUEST"); }
        catch (PersistedExternalFailureException exception) { return ExternalProblem(exception); }
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<HabitatAnalysisResponseDto>> Get(Guid id, CancellationToken cancellationToken) => (await service.GetAsync(id, cancellationToken)) is { } analysis ? Ok(analysis) : NotFound();

    private ActionResult ExternalProblem(PersistedExternalFailureException exception)
    {
        var status = exception.Kind switch { VulcanXFailureKind.Timeout => StatusCodes.Status504GatewayTimeout, VulcanXFailureKind.InvalidResponse or VulcanXFailureKind.UpstreamFailure => StatusCodes.Status502BadGateway, _ => StatusCodes.Status503ServiceUnavailable };
        return Problem(status, "Habitat analysis could not be completed", "The analysis record has been retained and can be retrieved by analysisId.", exception.Kind.ToString(), exception.RecordId);
    }
    private ActionResult Problem(int status, string title, string detail, string code, Guid? analysisId = null)
    {
        var problem = new ProblemDetails { Status = status, Title = title, Detail = detail };
        problem.Extensions["errorCode"] = code; problem.Extensions["traceId"] = HttpContext.TraceIdentifier;
        if (analysisId.HasValue) problem.Extensions["analysisId"] = analysisId.Value;
        return StatusCode(status, problem);
    }
}
