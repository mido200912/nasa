using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Requests;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Responses;

namespace VulcanX.Infrastructure.ExternalServices.VulcanXAI;

public sealed class VulcanXAiClient : IVulcanXAiClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient _httpClient;
    private readonly ILogger<VulcanXAiClient> _logger;

    public VulcanXAiClient(HttpClient httpClient, IOptions<VulcanXOptions> options, ILogger<VulcanXAiClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        var settings = options.Value;

        if (!Uri.TryCreate(settings.BaseUrl, UriKind.Absolute, out var baseUri))
        {
            throw new InvalidOperationException("VulcanX BaseUrl must be an absolute URI.");
        }

        _httpClient.BaseAddress = baseUri;
        _httpClient.Timeout = TimeSpan.FromSeconds(settings.TimeoutSeconds);
    }

    public Task<AiQueryResponse> QueryAsync(AiQueryRequest request, CancellationToken cancellationToken) =>
        PostAsync<AiQueryRequest, AiQueryResponse>("api/v1/ai/query", request, cancellationToken);

    public Task<StressTestResponse> RunStressTestAsync(StressTestRequest request, CancellationToken cancellationToken) =>
        PostAsync<StressTestRequest, StressTestResponse>("api/v1/simulator/stress-test", request, cancellationToken);

    public Task<HazardEvaluationResponse> EvaluateHazardAsync(HazardEvaluationRequest request, CancellationToken cancellationToken) =>
        PostAsync<HazardEvaluationRequest, HazardEvaluationResponse>("api/v1/simulator/hazard-evaluation", request, cancellationToken);

    public Task<DatasetCatalogResponse> GetDatasetsAsync(CancellationToken cancellationToken) =>
        GetAsync<DatasetCatalogResponse>("api/v1/datasets", cancellationToken);

    public Task<VulcanXHealthResponse> GetHealthAsync(CancellationToken cancellationToken) =>
        GetAsync<VulcanXHealthResponse>("health", cancellationToken);

    private async Task<TResponse> PostAsync<TRequest, TResponse>(string path, TRequest request, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _httpClient.PostAsJsonAsync(path, request, JsonOptions, cancellationToken);
            return await ReadResponseAsync<TResponse>(response, cancellationToken);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new VulcanXServiceException(VulcanXFailureKind.Timeout, "The AI service timed out.");
        }
        catch (HttpRequestException exception)
        {
            _logger.LogWarning(exception, "Vulcan-X could not be reached.");
            throw new VulcanXServiceException(VulcanXFailureKind.Unavailable, "The AI service is unavailable.");
        }
    }

    private async Task<TResponse> GetAsync<TResponse>(string path, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _httpClient.GetAsync(path, cancellationToken);
            return await ReadResponseAsync<TResponse>(response, cancellationToken);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new VulcanXServiceException(VulcanXFailureKind.Timeout, "The AI service timed out.");
        }
        catch (HttpRequestException exception)
        {
            _logger.LogWarning(exception, "Vulcan-X could not be reached.");
            throw new VulcanXServiceException(VulcanXFailureKind.Unavailable, "The AI service is unavailable.");
        }
    }

    private async Task<TResponse> ReadResponseAsync<TResponse>(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (!response.IsSuccessStatusCode)
        {
            var kind = response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.UnprocessableEntity
                ? VulcanXFailureKind.UpstreamFailure
                : VulcanXFailureKind.Unavailable;
            throw new VulcanXServiceException(kind, "The AI service returned an unsuccessful response.");
        }

        try
        {
            var payload = await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions, cancellationToken);
            return payload ?? throw new JsonException("Response body was empty.");
        }
        catch (JsonException exception)
        {
            _logger.LogWarning(exception, "Vulcan-X returned an invalid response format.");
            throw new VulcanXServiceException(VulcanXFailureKind.InvalidResponse, "The AI service returned an invalid response.");
        }
    }
}
