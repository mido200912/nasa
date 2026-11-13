using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI.Contracts.Requests;
using Xunit;

namespace NASA.FireSafety.API.Tests;

public sealed class VulcanXAiClientTests
{
    [Fact]
    public async Task QueryAsync_UsesDocumentedRouteAndSnakeCasePayload()
    {
        var handler = new StubHandler(async request =>
        {
            Assert.Equal(HttpMethod.Post, request.Method);
            Assert.Equal("/api/v1/ai/query", request.RequestUri!.AbsolutePath);
            var body = await request.Content!.ReadAsStringAsync();
            Assert.Contains("\"question\":\"What is FLEX?\"", body);
            Assert.Contains("\"environment\":\"iss\"", body);
            return Json(HttpStatusCode.OK, "{\"success\":true,\"answer\":\"Answer\",\"sources\":[\"FLEX\"],\"risk_level\":\"Low\"}");
        });
        var client = CreateClient(handler);

        var response = await client.QueryAsync(new AiQueryRequest { Question = "What is FLEX?", Environment = "iss" }, CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal("Answer", response.Answer);
        Assert.Equal("Low", response.RiskLevel);
    }

    [Fact]
    public async Task GetDatasetsAsync_RejectsMalformedSuccessPayload()
    {
        var client = CreateClient(new StubHandler(_ => Task.FromResult(Json(HttpStatusCode.OK, "not-json"))));

        var exception = await Assert.ThrowsAsync<VulcanXServiceException>(() => client.GetDatasetsAsync(CancellationToken.None));

        Assert.Equal(VulcanXFailureKind.InvalidResponse, exception.Kind);
    }

    [Fact]
    public async Task EvaluateHazardAsync_MapsUpstreamValidationFailure()
    {
        var client = CreateClient(new StubHandler(_ => Task.FromResult(Json(HttpStatusCode.BadRequest, "{\"success\":false,\"error\":\"Validation failed\"}"))));
        var request = new HazardEvaluationRequest
        {
            TargetPlanetOrHabitat = "iss",
            OxygenConcentration = 21,
            PressurePsi = 14.7,
            MaterialType = "Kapton"
        };

        var exception = await Assert.ThrowsAsync<VulcanXServiceException>(() => client.EvaluateHazardAsync(request, CancellationToken.None));

        Assert.Equal(VulcanXFailureKind.UpstreamFailure, exception.Kind);
    }

    [Fact]
    public void StressTestRequest_RejectsInvalidHabitatAndPressure()
    {
        var request = new StressTestRequest { Habitat = "earth", OxygenConcentration = 25, PressurePsi = 0, MaterialType = "PMMA" };
        var results = new List<ValidationResult>();

        var valid = Validator.TryValidateObject(request, new ValidationContext(request), results, validateAllProperties: true);

        Assert.False(valid);
        Assert.NotEmpty(results);
    }

    [Theory]
    [InlineData(HttpStatusCode.GatewayTimeout, VulcanXFailureKind.Timeout)]
    [InlineData(HttpStatusCode.BadGateway, VulcanXFailureKind.InvalidResponse)]
    [InlineData(HttpStatusCode.ServiceUnavailable, VulcanXFailureKind.Unavailable)]
    public async Task ProviderHttpFailuresPreserveSafeFailureKind(HttpStatusCode status, VulcanXFailureKind expected)
    {
        var client = CreateClient(new StubHandler(_ => Task.FromResult(Json(status, "{\"error\":\"private-provider-detail\"}"))));
        var error = await Assert.ThrowsAsync<VulcanXServiceException>(() => client.QueryAsync(new AiQueryRequest { Question = "Test provider failure", Environment = "iss" }, CancellationToken.None));
        Assert.Equal(expected, error.Kind);
        Assert.DoesNotContain("private", error.Message);
    }

    private static VulcanXAiClient CreateClient(HttpMessageHandler handler) => new(
        new HttpClient(handler),
        Options.Create(new VulcanXOptions { BaseUrl = "http://vulcan-x.test/", TimeoutSeconds = 10 }),
        NullLogger<VulcanXAiClient>.Instance);

    [Fact]
    public async Task OversizedUpstreamResponseIsRejectedBeforeDeserialization()
    {
        var client = CreateClient(new StubHandler(_ => Task.FromResult(Json(HttpStatusCode.OK, new string('x', 1024 * 1024 + 1)))));
        var exception = await Assert.ThrowsAsync<VulcanXServiceException>(() => client.GetDatasetsAsync(CancellationToken.None));
        Assert.Equal(VulcanXFailureKind.InvalidResponse, exception.Kind);
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string content) => new(status)
    {
        Content = new StringContent(content, Encoding.UTF8, "application/json")
    };

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _handler;

        public StubHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> handler) => _handler = handler;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => _handler(request);
    }
}
