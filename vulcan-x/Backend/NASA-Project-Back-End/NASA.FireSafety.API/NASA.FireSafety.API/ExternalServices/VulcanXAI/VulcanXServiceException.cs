namespace VulcanX.Infrastructure.ExternalServices.VulcanXAI;

public sealed class VulcanXServiceException : Exception
{
    public VulcanXServiceException(VulcanXFailureKind kind, string message) : base(message) => Kind = kind;

    public VulcanXFailureKind Kind { get; }
}
