using VulcanX.Infrastructure.ExternalServices.VulcanXAI;

namespace NASA.FireSafety.API.Services;

public sealed class PersistedExternalFailureException(Guid recordId, VulcanXFailureKind kind) : Exception
{
    public Guid RecordId { get; } = recordId;
    public VulcanXFailureKind Kind { get; } = kind;
}
