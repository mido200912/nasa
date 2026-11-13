namespace VulcanX.Infrastructure.ExternalServices.VulcanXAI;

public enum VulcanXFailureKind
{
    Unavailable,
    Timeout,
    UpstreamFailure,
    InvalidResponse
}
