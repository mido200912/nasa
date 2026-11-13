using Microsoft.EntityFrameworkCore;
using NASA.FireSafety.API.Data;
using NASA.FireSafety.API.Interfaces;
using NASA.FireSafety.API.Middleware;
using NASA.FireSafety.API.Services;
using VulcanX.Infrastructure.ExternalServices.VulcanXAI;

var builder = WebApplication.CreateBuilder(args);
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
builder.Services.AddHttpClient<IVulcanXAiClient, VulcanXAiClient>();

builder.Services.AddDbContext<FireSafetyDbContext>(options => options.UseSqlServer(builder.Configuration.GetConnectionString("FireSafetyDb")));
builder.Services.AddScoped<ICatalogQueryService, CatalogQueryService>();
builder.Services.AddScoped<ICuratedCatalogSeeder, CuratedCatalogSeeder>();
builder.Services.AddScoped<IHabitatAnalysisService, HabitatAnalysisService>();
builder.Services.AddScoped<IKnowledgeQueryService, KnowledgeQueryService>();

var app = builder.Build();
if (string.IsNullOrWhiteSpace(app.Configuration.GetConnectionString("FireSafetyDb")))
    throw new InvalidOperationException("Database configuration is missing. Set ConnectionStrings__FireSafetyDb locally.");

if (args.Contains("--seed-curated-catalog", StringComparer.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var result = await scope.ServiceProvider.GetRequiredService<ICuratedCatalogSeeder>().SeedAsync(CancellationToken.None);
    app.Logger.LogInformation("Curated catalog seed completed: {@SeedResult}", result);
    return;
}

// Configure the HTTP request pipeline.
app.UseMiddleware<SafeErrorsMiddleware>();
app.UseMiddleware<RequestProtectionMiddleware>();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program { }
