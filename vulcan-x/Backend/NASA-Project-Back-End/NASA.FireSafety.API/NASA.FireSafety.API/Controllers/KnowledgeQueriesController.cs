using Microsoft.AspNetCore.Mvc;
using NASA.FireSafety.API.DTOs.Knowledge;
using NASA.FireSafety.API.Interfaces;
using NASA.FireSafety.API.Services;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;

namespace NASA.FireSafety.API.Controllers;

[ApiController, Route("api/knowledge/queries")]
public sealed class KnowledgeQueriesController(IKnowledgeQueryService service) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<KnowledgeQueryResponseDto>> Create([FromBody] CreateKnowledgeQueryRequest request, CancellationToken cancellationToken)
    {
        try { return StatusCode(StatusCodes.Status201Created, await service.CreateAsync(request, cancellationToken)); }
        catch (CatalogRecordNotFoundException exception) { return Problem(StatusCodes.Status404NotFound, "Catalog record was not found", exception.Resource, "CATALOG_NOT_FOUND"); }
        catch (InvalidRequestException exception) { return Problem(StatusCodes.Status400BadRequest, "Invalid knowledge query", exception.Message, "KNOWLEDGE_INVALID_REQUEST"); }
        catch (PersistedExternalFailureException exception)
        {
            var status = exception.Kind switch
            {
                VulcanXFailureKind.Timeout => StatusCodes.Status504GatewayTimeout,
                VulcanXFailureKind.InvalidResponse or VulcanXFailureKind.UpstreamFailure => StatusCodes.Status502BadGateway,
                _ => StatusCodes.Status503ServiceUnavailable
            };
            return Problem(status, "Knowledge query could not be completed", "The query record has been retained.", exception.Kind.ToString(), exception.RecordId);
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<KnowledgeQueryResponseDto>> Get(Guid id, CancellationToken cancellationToken) => (await service.GetAsync(id, cancellationToken)) is { } query ? Ok(query) : NotFound();

    private ActionResult Problem(int status, string title, string detail, string code, Guid? queryId = null)
    {
        var problem = new ProblemDetails { Status = status, Title = title, Detail = detail };
        problem.Extensions["errorCode"] = code; problem.Extensions["traceId"] = HttpContext.TraceIdentifier;
        if (queryId.HasValue) problem.Extensions["queryId"] = queryId.Value;
        return StatusCode(status, problem);
    }
}
