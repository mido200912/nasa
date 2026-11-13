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
    private readonly TimeSpan _deadline;

    public VulcanXAiClient(HttpClient httpClient, IOptions<VulcanXOptions> options, ILogger<VulcanXAiClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        var settings = options.Value;

        if (!Uri.TryCreate(settings.BaseUrl, UriKind.Absolute, out var baseUri)
            || baseUri.Scheme is not ("http" or "https") || !string.IsNullOrEmpty(baseUri.UserInfo)
            || baseUri.AbsolutePath != "/" || !string.IsNullOrEmpty(baseUri.Query) || !string.IsNullOrEmpty(baseUri.Fragment))
        {
            throw new InvalidOperationException("VulcanX BaseUrl must be an absolute URI.");
        }

        _httpClient.BaseAddress = baseUri;
        _httpClient.Timeout = TimeSpan.FromSeconds(settings.TimeoutSeconds);
        _deadline = _httpClient.Timeout;
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
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(_deadline);
        try
        {
            using var message = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(request, options: JsonOptions) };
            using var response = await _httpClient.SendAsync(message, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
            return await ReadResponseAsync<TResponse>(response, deadline.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new VulcanXServiceException(VulcanXFailureKind.Timeout, "The AI service timed out.");
        }
        catch (HttpRequestException)
        {
            _logger.LogWarning("Vulcan-X request failed {Category}", "transport");
            throw new VulcanXServiceException(VulcanXFailureKind.Unavailable, "The AI service is unavailable.");
        }
    }

    private async Task<TResponse> GetAsync<TResponse>(string path, CancellationToken cancellationToken)
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(_deadline);
        try
        {
            using var response = await _httpClient.GetAsync(path, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
            return await ReadResponseAsync<TResponse>(response, deadline.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new VulcanXServiceException(VulcanXFailureKind.Timeout, "The AI service timed out.");
        }
        catch (HttpRequestException)
        {
            _logger.LogWarning("Vulcan-X request failed {Category}", "transport");
            throw new VulcanXServiceException(VulcanXFailureKind.Unavailable, "The AI service is unavailable.");
        }
    }

    private async Task<TResponse> ReadResponseAsync<TResponse>(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (!response.IsSuccessStatusCode)
        {
            var kind = response.StatusCode switch
            {
                HttpStatusCode.GatewayTimeout => VulcanXFailureKind.Timeout,
                HttpStatusCode.BadGateway => VulcanXFailureKind.InvalidResponse,
                HttpStatusCode.BadRequest or HttpStatusCode.UnprocessableEntity => VulcanXFailureKind.UpstreamFailure,
                _ => VulcanXFailureKind.Unavailable
            };
            throw new VulcanXServiceException(kind, "The AI service returned an unsuccessful response.");
        }

        try
        {
            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var bounded = new MemoryStream();
            var buffer = new byte[8192];
            int count;
            while ((count = await stream.ReadAsync(buffer, cancellationToken)) > 0)
            {
                if (bounded.Length + count > 1024 * 1024) throw new JsonException("Response limit");
                await bounded.WriteAsync(buffer.AsMemory(0, count), cancellationToken);
            }
            var payload = JsonSerializer.Deserialize<TResponse>(bounded.ToArray(), JsonOptions);
            return payload ?? throw new JsonException("Response body was empty.");
        }
        catch (JsonException)
        {
            _logger.LogWarning("Vulcan-X request failed {Category}", "invalid_response");
            throw new VulcanXServiceException(VulcanXFailureKind.InvalidResponse, "The AI service returned an invalid response.");
        }
    }
}
