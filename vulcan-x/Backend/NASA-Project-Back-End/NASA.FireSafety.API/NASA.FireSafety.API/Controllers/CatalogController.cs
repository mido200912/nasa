using Microsoft.AspNetCore.Mvc;
using NASA.FireSafety.API.DTOs.Catalog;
using NASA.FireSafety.API.Interfaces;

namespace NASA.FireSafety.API.Controllers;

[Route("api")]
public sealed class CatalogController(ICatalogQueryService catalog) : CatalogControllerBase
{
    [HttpGet("environments")]
    [ProducesResponseType(typeof(IReadOnlyList<EnvironmentListItemDto>), StatusCodes.Status200OK)]
    public Task<IReadOnlyList<EnvironmentListItemDto>> GetEnvironments(CancellationToken cancellationToken) =>
        catalog.GetEnvironmentsAsync(cancellationToken);

    [HttpGet("materials")]
    [ProducesResponseType(typeof(PagedResponse<MaterialListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<MaterialListItemDto>>> GetMaterials([FromQuery] MaterialListQuery query, CancellationToken cancellationToken)
    {
        if (ValidatePage(query) is { } problem) return problem;
        return Ok(await catalog.GetMaterialsAsync(query, cancellationToken));
    }

    [HttpGet("materials/{id:int}")]
    public async Task<ActionResult<MaterialDetailDto>> GetMaterial(int id, CancellationToken cancellationToken)
    {
        if (ValidatePositiveId(id) is { } problem) return problem;
        var material = await catalog.GetMaterialAsync(id, cancellationToken);
        return material is null ? NotFoundProblem("material") : Ok(material);
    }

    [HttpGet("experiments")]
    [ProducesResponseType(typeof(PagedResponse<ExperimentListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<ExperimentListItemDto>>> GetExperiments([FromQuery] ExperimentListQuery query, CancellationToken cancellationToken)
    {
        if (ValidatePage(query) is { } problem) return problem;
        if (query.MaterialId is <= 0) return BadRequestProblem("Invalid material filter", "CATALOG_INVALID_MATERIAL_ID", "materialId must be a positive integer when supplied.");
        return Ok(await catalog.GetExperimentsAsync(query, cancellationToken));
    }

    [HttpGet("experiments/{id:int}")]
    public async Task<ActionResult<ExperimentDetailDto>> GetExperiment(int id, CancellationToken cancellationToken)
    {
        if (ValidatePositiveId(id) is { } problem) return problem;
        var experiment = await catalog.GetExperimentAsync(id, cancellationToken);
        return experiment is null ? NotFoundProblem("experiment") : Ok(experiment);
    }

    [HttpGet("sources/{id:int}")]
    public async Task<ActionResult<SourceDetailDto>> GetSource(int id, CancellationToken cancellationToken)
    {
        if (ValidatePositiveId(id) is { } problem) return problem;
        var source = await catalog.GetSourceAsync(id, cancellationToken);
        return source is null ? NotFoundProblem("source") : Ok(source);
    }

    [HttpGet("technologies")]
    [ProducesResponseType(typeof(PagedResponse<TechnologyListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<TechnologyListItemDto>>> GetTechnologies([FromQuery] TechnologyListQuery query, CancellationToken cancellationToken)
    {
        if (ValidatePage(query) is { } problem) return problem;
        if (!IsTechnologyCategory(query.Category)) return BadRequestProblem("Invalid technology category", "CATALOG_INVALID_CATEGORY", "category must be a TechnologyCategory value.");
        if (!IsTechnologyDomain(query.Domain)) return BadRequestProblem("Invalid technology domain", "CATALOG_INVALID_DOMAIN", "domain must be Space or Earth.");
        return Ok(await catalog.GetTechnologiesAsync(query, cancellationToken));
    }

    [HttpGet("technologies/{id:int}")]
    public async Task<ActionResult<TechnologyDetailDto>> GetTechnology(int id, CancellationToken cancellationToken)
    {
        if (ValidatePositiveId(id) is { } problem) return problem;
        var technology = await catalog.GetTechnologyAsync(id, cancellationToken);
        return technology is null ? NotFoundProblem("technology") : Ok(technology);
    }

    private static bool IsTechnologyCategory(string? value) => string.IsNullOrWhiteSpace(value) || Enum.TryParse<Entities.TechnologyCategory>(value, true, out _);
    private static bool IsTechnologyDomain(string? value) => string.IsNullOrWhiteSpace(value) || Enum.TryParse<Entities.TechnologyApplicationDomain>(value, true, out _);
}
