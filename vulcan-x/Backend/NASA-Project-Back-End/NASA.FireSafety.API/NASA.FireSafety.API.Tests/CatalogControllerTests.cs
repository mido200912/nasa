using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NASA.FireSafety.API.Controllers;
using NASA.FireSafety.API.DTOs.Catalog;
using NASA.FireSafety.API.Interfaces;
using Xunit;

namespace NASA.FireSafety.API.Tests;

public sealed class CatalogControllerTests
{
    [Fact]
    public async Task GetMaterials_ReturnsProblemDetails_ForInvalidPagination()
    {
        var controller = CreateController();

        var result = await controller.GetMaterials(new MaterialListQuery { Page = 0, PageSize = 20 }, CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal("CATALOG_INVALID_PAGINATION", problem.Extensions["errorCode"]);
    }

    [Fact]
    public async Task GetTechnologies_ReturnsProblemDetails_ForInvalidDomain()
    {
        var controller = CreateController();

        var result = await controller.GetTechnologies(new TechnologyListQuery { Domain = "Mars", Page = 1, PageSize = 20 }, CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal("CATALOG_INVALID_DOMAIN", problem.Extensions["errorCode"]);
    }

    private static CatalogController CreateController() => new(new EmptyCatalogQueryService())
    {
        ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
    };

    private sealed class EmptyCatalogQueryService : ICatalogQueryService
    {
        public Task<IReadOnlyList<EnvironmentListItemDto>> GetEnvironmentsAsync(CancellationToken cancellationToken) => Task.FromResult<IReadOnlyList<EnvironmentListItemDto>>([]);
        public Task<PagedResponse<MaterialListItemDto>> GetMaterialsAsync(MaterialListQuery query, CancellationToken cancellationToken) => Task.FromResult(new PagedResponse<MaterialListItemDto>([], query.Page, query.PageSize, 0));
        public Task<MaterialDetailDto?> GetMaterialAsync(int id, CancellationToken cancellationToken) => Task.FromResult<MaterialDetailDto?>(null);
        public Task<PagedResponse<ExperimentListItemDto>> GetExperimentsAsync(ExperimentListQuery query, CancellationToken cancellationToken) => Task.FromResult(new PagedResponse<ExperimentListItemDto>([], query.Page, query.PageSize, 0));
        public Task<ExperimentDetailDto?> GetExperimentAsync(int id, CancellationToken cancellationToken) => Task.FromResult<ExperimentDetailDto?>(null);
        public Task<SourceDetailDto?> GetSourceAsync(int id, CancellationToken cancellationToken) => Task.FromResult<SourceDetailDto?>(null);
        public Task<PagedResponse<TechnologyListItemDto>> GetTechnologiesAsync(TechnologyListQuery query, CancellationToken cancellationToken) => Task.FromResult(new PagedResponse<TechnologyListItemDto>([], query.Page, query.PageSize, 0));
        public Task<TechnologyDetailDto?> GetTechnologyAsync(int id, CancellationToken cancellationToken) => Task.FromResult<TechnologyDetailDto?>(null);
    }
}
