using Microsoft.AspNetCore.Mvc;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;

namespace NASA.FireSafety.API.Controllers;

[ApiController]
public abstract class VulcanXControllerBase : ControllerBase
{
    protected async Task<ActionResult<T>> ExecuteAsync<T>(Func<Task<T>> action)
    {
        try
        {
            return Ok(await action());
        }
        catch (VulcanXServiceException exception)
        {
            var (status, title, code) = exception.Kind switch
            {
                VulcanXFailureKind.Timeout => (StatusCodes.Status504GatewayTimeout, "AI service timed out", "VULCANX_TIMEOUT"),
                VulcanXFailureKind.InvalidResponse => (StatusCodes.Status502BadGateway, "AI service returned an invalid response", "VULCANX_INVALID_RESPONSE"),
                VulcanXFailureKind.UpstreamFailure => (StatusCodes.Status502BadGateway, "AI service rejected the request", "VULCANX_UPSTREAM_FAILURE"),
                _ => (StatusCodes.Status503ServiceUnavailable, "AI service unavailable", "VULCANX_UNAVAILABLE")
            };

            return StatusCode(status, new ProblemDetails
            {
                Status = status,
                Title = title,
                Detail = "The request could not be completed by the AI service.",
                Extensions = { ["errorCode"] = code, ["traceId"] = HttpContext.TraceIdentifier }
            });
        }
    }
}
