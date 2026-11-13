using NASA.FireSafety.API.DTOs.Habitat;

namespace NASA.FireSafety.API.Interfaces;

public interface IHabitatAnalysisService
{
    Task<HabitatAnalysisResponseDto> CreateAsync(CreateHabitatAnalysisRequest request, CancellationToken cancellationToken);
    Task<HabitatAnalysisResponseDto?> GetAsync(Guid id, CancellationToken cancellationToken);
}
