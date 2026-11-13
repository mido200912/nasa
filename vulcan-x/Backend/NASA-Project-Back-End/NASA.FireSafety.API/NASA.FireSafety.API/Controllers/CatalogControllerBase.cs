using Microsoft.AspNetCore.Mvc;
using NASA.FireSafety.API.DTOs.Catalog;

namespace NASA.FireSafety.API.Controllers;

[ApiController]
public abstract class CatalogControllerBase : ControllerBase
{
    protected ActionResult? ValidatePage(PageQuery query)
    {
        if (query.Page is < 1 || query.PageSize is < 1 or > 100)
            return BadRequestProblem("Invalid pagination", "CATALOG_INVALID_PAGINATION", "page must be at least 1 and pageSize must be between 1 and 100.");
        return null;
    }

    protected ActionResult? ValidatePositiveId(int id) => id < 1
        ? BadRequestProblem("Invalid identifier", "CATALOG_INVALID_ID", "The identifier must be a positive integer.")
        : null;

    protected ActionResult BadRequestProblem(string title, string errorCode, string detail) => BadRequest(new ProblemDetails
    {
        Status = StatusCodes.Status400BadRequest,
        Title = title,
        Detail = detail,
        Extensions = { ["errorCode"] = errorCode, ["traceId"] = HttpContext.TraceIdentifier }
    });

    protected ActionResult NotFoundProblem(string resource) => NotFound(new ProblemDetails
    {
        Status = StatusCodes.Status404NotFound,
        Title = "Catalog record was not found",
        Detail = $"The requested {resource} is unavailable.",
        Extensions = { ["errorCode"] = "CATALOG_NOT_FOUND", ["traceId"] = HttpContext.TraceIdentifier }
    });
}
