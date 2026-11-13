using Microsoft.EntityFrameworkCore;
using NASA.FireSafety.API.Data;
using NASA.FireSafety.API.DTOs.Catalog;
using NASA.FireSafety.API.Entities;
using NASA.FireSafety.API.Interfaces;

namespace NASA.FireSafety.API.Services;

public sealed class CatalogQueryService(FireSafetyDbContext dbContext) : ICatalogQueryService
{
    public async Task<IReadOnlyList<EnvironmentListItemDto>> GetEnvironmentsAsync(CancellationToken cancellationToken)
    {
        var environments = await dbContext.SpaceEnvironments.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return environments.Select(x => new EnvironmentListItemDto(x.Id, x.Code, x.Name, x.EnvironmentType.ToString(),
            x.DefaultOxygenVolumePercent is null && x.DefaultPressureKPa is null && x.DefaultTemperatureCelsius is null && x.DefaultGravityRegime is null && x.DefaultEffectiveGravityG is null
                ? null
                : new EnvironmentDefaultsDto(x.DefaultOxygenVolumePercent, x.DefaultPressureKPa, x.DefaultTemperatureCelsius, x.DefaultGravityRegime?.ToString(), x.DefaultEffectiveGravityG, x.DefaultsSourceId)))
            .ToList();
    }

    public async Task<PagedResponse<MaterialListItemDto>> GetMaterialsAsync(MaterialListQuery query, CancellationToken cancellationToken)
    {
        var materials = dbContext.Materials.AsNoTracking().Where(x => x.IsActive);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            materials = materials.Where(x => x.Code.Contains(term) || x.Name.Contains(term));
        }
        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            var category = query.Category.Trim();
            materials = materials.Where(x => x.Category == category);
        }

        var total = await materials.CountAsync(cancellationToken);
        var items = await materials.OrderBy(x => x.Name).ThenBy(x => x.Code)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(x => new MaterialListItemDto(x.Id, x.Code, x.Name, x.Category))
            .ToListAsync(cancellationToken);
        return new PagedResponse<MaterialListItemDto>(items, query.Page, query.PageSize, total);
    }

    public async Task<MaterialDetailDto?> GetMaterialAsync(int id, CancellationToken cancellationToken)
    {
        var material = await dbContext.Materials.AsNoTracking().Include(x => x.Properties)
            .SingleOrDefaultAsync(x => x.Id == id && x.IsActive, cancellationToken);
        return material is null ? null : new MaterialDetailDto(material.Id, material.Code, material.Name, material.Category, material.Description,
            material.Properties.OrderBy(x => x.DisplayName).Select(x => new MaterialPropertyDto(x.PropertyKey, x.DisplayName, x.ValueType.ToString(), x.ValueNumber, x.ValueText, x.Unit, x.Uncertainty, x.ResearchSourceId)).ToList());
    }

    public async Task<PagedResponse<ExperimentListItemDto>> GetExperimentsAsync(ExperimentListQuery query, CancellationToken cancellationToken)
    {
        var experiments = dbContext.Experiments.AsNoTracking().Where(x => x.CurationStatus == CurationStatus.ApprovedForDisplay);
        if (!string.IsNullOrWhiteSpace(query.Search)) { var term = query.Search.Trim(); experiments = experiments.Where(x => x.Title.Contains(term)); }
        if (!string.IsNullOrWhiteSpace(query.Discipline)) { var discipline = query.Discipline.Trim(); experiments = experiments.Where(x => x.Discipline == discipline); }
        if (!string.IsNullOrWhiteSpace(query.GravityCondition)) { var gravity = query.GravityCondition.Trim(); experiments = experiments.Where(x => x.GravityCondition == gravity); }
        if (query.MaterialId.HasValue) { var materialId = query.MaterialId.Value; experiments = experiments.Where(x => x.ExperimentMaterials.Any(m => m.MaterialId == materialId)); }

        var total = await experiments.CountAsync(cancellationToken);
        var items = await experiments.OrderBy(x => x.Title).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .Select(x => new ExperimentListItemDto(x.Id, x.Title, x.Discipline, x.Platform, x.GravityCondition)).ToListAsync(cancellationToken);
        return new PagedResponse<ExperimentListItemDto>(items, query.Page, query.PageSize, total);
    }

    public async Task<ExperimentDetailDto?> GetExperimentAsync(int id, CancellationToken cancellationToken)
    {
        var experiment = await dbContext.Experiments.AsNoTracking()
            .Include(x => x.Parameters).Include(x => x.ExperimentMaterials).ThenInclude(x => x.Material)
            .Include(x => x.ExperimentSources).ThenInclude(x => x.ResearchSource)
            .SingleOrDefaultAsync(x => x.Id == id && x.CurationStatus == CurationStatus.ApprovedForDisplay, cancellationToken);
        return experiment is null ? null : new ExperimentDetailDto(experiment.Id, experiment.Title, experiment.ExternalSystem, experiment.ExternalId, experiment.Discipline, experiment.Platform, experiment.GravityCondition, experiment.Summary, experiment.KeyFindings,
            experiment.Parameters.OrderBy(x => x.DisplayName).Select(x => new ExperimentParameterDto(x.ParameterKey, x.Category.ToString(), x.DisplayName, x.OriginalLabel, x.ValueType.ToString(), x.ValueNumber, x.ValueText, x.ValueMin, x.ValueMax, x.Unit, x.Uncertainty, x.ResearchSourceId)).ToList(),
            experiment.ExperimentMaterials.OrderBy(x => x.Material.Name).Select(x => new ExperimentMaterialDto(x.MaterialId, x.Material.Code, x.Material.Name, x.Role)).ToList(),
            experiment.ExperimentSources.OrderBy(x => x.Role).Select(x => new ExperimentSourceDto(x.ResearchSourceId, x.ResearchSource.Title, x.Role.ToString(), x.ResearchSource.DoiNormalized, x.ResearchSource.SourceUrl)).ToList());
    }

    public async Task<SourceDetailDto?> GetSourceAsync(int id, CancellationToken cancellationToken)
    {
        var source = await dbContext.ResearchSources.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.CurationStatus == CurationStatus.ApprovedForDisplay, cancellationToken);
        return source is null ? null : new SourceDetailDto(source.Id, source.Title, source.SourceType.ToString(), source.Origin.ToString(), source.ExternalSystem, source.ExternalId, source.DoiNormalized, source.SourceUrl, source.CurationStatus.ToString(), source.PublicationDate, source.Publisher, source.CitationText);
    }

    public async Task<PagedResponse<TechnologyListItemDto>> GetTechnologiesAsync(TechnologyListQuery query, CancellationToken cancellationToken)
    {
        var technologies = dbContext.Technologies.AsNoTracking().Where(x => x.IsPublished);
        if (!string.IsNullOrWhiteSpace(query.Search)) { var term = query.Search.Trim(); technologies = technologies.Where(x => x.Name.Contains(term) || x.Summary.Contains(term)); }
        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            if (!Enum.TryParse<TechnologyCategory>(query.Category, true, out var category)) return new PagedResponse<TechnologyListItemDto>([], query.Page, query.PageSize, 0);
            technologies = technologies.Where(x => x.Category == category);
        }
        if (!string.IsNullOrWhiteSpace(query.Domain))
        {
            if (!Enum.TryParse<TechnologyApplicationDomain>(query.Domain, true, out var domain)) return new PagedResponse<TechnologyListItemDto>([], query.Page, query.PageSize, 0);
            technologies = technologies.Where(x => x.Applications.Any(a => a.Domain == domain));
        }
        var total = await technologies.CountAsync(cancellationToken);
        var entities = await technologies.OrderBy(x => x.Name).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync(cancellationToken);
        return new PagedResponse<TechnologyListItemDto>(entities.Select(x => new TechnologyListItemDto(x.Id, x.Slug, x.Name, x.Category.ToString(), x.Summary)).ToList(), query.Page, query.PageSize, total);
    }

    public async Task<TechnologyDetailDto?> GetTechnologyAsync(int id, CancellationToken cancellationToken)
    {
        var technology = await dbContext.Technologies.AsNoTracking().Include(x => x.Applications).ThenInclude(x => x.ResearchSource)
            .Include(x => x.TechnologyExperiments).ThenInclude(x => x.Experiment)
            .SingleOrDefaultAsync(x => x.Id == id && x.IsPublished, cancellationToken);
        return technology is null ? null : new TechnologyDetailDto(technology.Id, technology.Slug, technology.Name, technology.Category.ToString(), technology.Summary, technology.Description, technology.SpaceOriginSummary,
            technology.Applications.OrderBy(x => x.SortOrder).Select(x => new TechnologyApplicationDto(x.Id, x.Domain.ToString(), x.Title, x.Description, x.EvidenceLevel.ToString(), x.ResearchSource is null ? null : new SourceReferenceDto(x.ResearchSource.Id, x.ResearchSource.Title, x.ResearchSource.DoiNormalized, x.ResearchSource.SourceUrl))).ToList(),
            technology.TechnologyExperiments.OrderBy(x => x.Experiment.Title).Select(x => new RelatedExperimentDto(x.Experiment.Id, x.Experiment.Title, x.Experiment.Discipline, x.Experiment.Platform, x.Experiment.GravityCondition)).ToList());
    }
}
