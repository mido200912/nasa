using NASA.FireSafety.API.DTOs.Catalog;

namespace NASA.FireSafety.API.Interfaces;

public interface ICatalogQueryService
{
    Task<IReadOnlyList<EnvironmentListItemDto>> GetEnvironmentsAsync(CancellationToken cancellationToken);
    Task<PagedResponse<MaterialListItemDto>> GetMaterialsAsync(MaterialListQuery query, CancellationToken cancellationToken);
    Task<MaterialDetailDto?> GetMaterialAsync(int id, CancellationToken cancellationToken);
    Task<PagedResponse<ExperimentListItemDto>> GetExperimentsAsync(ExperimentListQuery query, CancellationToken cancellationToken);
    Task<ExperimentDetailDto?> GetExperimentAsync(int id, CancellationToken cancellationToken);
    Task<SourceDetailDto?> GetSourceAsync(int id, CancellationToken cancellationToken);
    Task<PagedResponse<TechnologyListItemDto>> GetTechnologiesAsync(TechnologyListQuery query, CancellationToken cancellationToken);
    Task<TechnologyDetailDto?> GetTechnologyAsync(int id, CancellationToken cancellationToken);
}
