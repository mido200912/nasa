using NASA.FireSafety.API.DTOs.Knowledge;

namespace NASA.FireSafety.API.Interfaces;

public interface IKnowledgeQueryService
{
    Task<KnowledgeQueryResponseDto> CreateAsync(CreateKnowledgeQueryRequest request, CancellationToken cancellationToken);
    Task<KnowledgeQueryResponseDto?> GetAsync(Guid id, CancellationToken cancellationToken);
}
