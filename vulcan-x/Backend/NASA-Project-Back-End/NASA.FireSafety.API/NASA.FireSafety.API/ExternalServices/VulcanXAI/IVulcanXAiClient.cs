using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Requests;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Responses;

namespace VulcanX.Infrastructure.ExternalServices.VulcanXAI;

public interface IVulcanXAiClient
{
    Task<AiQueryResponse> QueryAsync(AiQueryRequest request, CancellationToken cancellationToken);
    Task<StressTestResponse> RunStressTestAsync(StressTestRequest request, CancellationToken cancellationToken);
    Task<HazardEvaluationResponse> EvaluateHazardAsync(HazardEvaluationRequest request, CancellationToken cancellationToken);
    Task<DatasetCatalogResponse> GetDatasetsAsync(CancellationToken cancellationToken);
    Task<VulcanXHealthResponse> GetHealthAsync(CancellationToken cancellationToken);
}
