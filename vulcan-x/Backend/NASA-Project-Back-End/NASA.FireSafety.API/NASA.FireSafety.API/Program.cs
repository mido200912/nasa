using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Data.SqlClient;
using NASA.FireSafety.API.Data;
using NASA.FireSafety.API.Interfaces;
using NASA.FireSafety.API.Middleware;
using NASA.FireSafety.API.Services;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;

if (args.Contains("--healthcheck"))
{
    try
    {
        using var probe = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
        using var response = await probe.GetAsync("http://127.0.0.1:8080/health/live");
        Environment.ExitCode = response.IsSuccessStatusCode ? 0 : 1;
    }
    catch { Environment.ExitCode = 1; }
    return;
}
var builder = WebApplication.CreateBuilder(args);
if (Environment.GetEnvironmentVariable("ASPNETCORE_FORWARDEDHEADERS_ENABLED") == "true")
    throw new InvalidOperationException("Use explicit TrustedProxyAddresses instead of automatic forwarded-header trust.");
builder.Logging.AddJsonConsole();
var rateOptions = builder.Configuration.GetSection("AnonymousRateLimit").Get<AnonymousRateOptions>() ?? new();
builder.Services.AddSingleton(new AnonymousRateLimits(rateOptions));
builder.Services.Configure<ForwardedHeadersOptions>(options => ProductionConfiguration.ConfigureForwarding(options, builder.Configuration));
builder.Services.AddHttpContextAccessor();
builder.Services.AddTransient<CorrelationHandler>();
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = RequestProtectionMiddleware.MaximumBodyBytes);
builder.Services.AddSingleton<RequestConcurrencyLimits>();
builder.Services.AddOptions<HabitatSubmissionOptions>().Bind(builder.Configuration.GetSection("HabitatSubmission"))
    .Validate(options => !options.Enabled || !string.IsNullOrWhiteSpace(options.ApprovedFixtureReference), "An enabled Habitat submission requires a science-team-approved fixture reference.")
    .ValidateOnStart();

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services
    .AddOptions<VulcanXOptions>()
    .Bind(builder.Configuration.GetSection(VulcanXOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddHttpClient<IVulcanXAiClient, VulcanXAiClient>()
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false })
    .AddHttpMessageHandler<CorrelationHandler>();
builder.Services.AddHttpClient("readiness", client => client.Timeout = TimeSpan.FromSeconds(3));

builder.Services.AddDbContext<FireSafetyDbContext>(options => options.UseSqlServer(builder.Configuration.GetConnectionString("FireSafetyDb"),
    sql => sql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(3), null)));
builder.Services.AddScoped<ICatalogQueryService, CatalogQueryService>();
builder.Services.AddScoped<ICuratedCatalogSeeder, CuratedCatalogSeeder>();
builder.Services.AddScoped<IHabitatAnalysisService, HabitatAnalysisService>();
builder.Services.AddScoped<IKnowledgeQueryService, KnowledgeQueryService>();

var app = builder.Build();
if (string.IsNullOrWhiteSpace(app.Configuration.GetConnectionString("FireSafetyDb")))
    throw new InvalidOperationException("Database configuration is missing. Set ConnectionStrings__FireSafetyDb locally.");
if (app.Environment.IsProduction()) ProductionConfiguration.ValidateSql(app.Configuration.GetConnectionString("FireSafetyDb")!);
if (args.Contains("--migrate-database", StringComparer.OrdinalIgnoreCase) || args.Contains("--seed-curated-catalog", StringComparer.OrdinalIgnoreCase))
{
    var target = new SqlConnectionStringBuilder(app.Configuration.GetConnectionString("FireSafetyDb")).InitialCatalog;
    if (app.Environment.IsProduction() && app.Configuration["DATABASE_MIGRATION_CONFIRM"] != target)
        throw new InvalidOperationException("Explicit database target confirmation is required for production provisioning.");
}
if (args.Contains("--migrate-database", StringComparer.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<FireSafetyDbContext>().Database.MigrateAsync();
    app.Logger.LogInformation("Explicit database migration completed");
    return;
}

if (args.Contains("--seed-curated-catalog", StringComparer.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var result = await scope.ServiceProvider.GetRequiredService<ICuratedCatalogSeeder>().SeedAsync(CancellationToken.None);
    app.Logger.LogInformation("Curated catalog seed completed: {@SeedResult}", result);
    return;
}

// Configure the HTTP request pipeline.
app.UseForwardedHeaders();
app.UseMiddleware<RequestTelemetryMiddleware>();
app.UseMiddleware<SafeErrorsMiddleware>();
app.UseMiddleware<AnonymousRateMiddleware>();
app.UseMiddleware<RequestProtectionMiddleware>();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();
app.MapGet("/health/live", () => Results.Json(new { status = "live" }));
app.MapGet("/health/ready", async (FireSafetyDbContext db, IHttpClientFactory clients, IConfiguration config, CancellationToken aborted) =>
{
    using var deadline = CancellationTokenSource.CreateLinkedTokenSource(aborted);
    deadline.CancelAfter(TimeSpan.FromSeconds(3));
    var sql = false; var vulcan = false;
    try { sql = await db.Database.CanConnectAsync(deadline.Token); } catch { /* safe aggregate status only */ }
    try
    {
        var endpoint = new Uri(new Uri(config["VulcanX:BaseUrl"]!), "/health/ready");
        using var response = await clients.CreateClient("readiness").GetAsync(endpoint, deadline.Token);
        vulcan = response.IsSuccessStatusCode;
    }
    catch { /* never expose private addresses or provider error bodies */ }
    return Results.Json(new { status = sql && vulcan ? "ready" : "unavailable", dependencies = new { sql = sql ? "available" : "unavailable", vulcan = vulcan ? "available" : "unavailable", provider = "unknown" } }, statusCode: sql && vulcan ? 200 : 503);
});

app.Run();

public partial class Program { }
