using CroutApi.Helpers;
using CroutApi.Repositories;
using CroutApi.Services;
using CroutApi.Services.SchemaSync;
using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;

var migrationExitCode = await SchemaUpdater.TryRunAsync(args);
if (migrationExitCode.HasValue)
{
    Environment.ExitCode = migrationExitCode.Value;
    return;
}

var builder = WebApplication.CreateBuilder(args);

SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());

// -- Config from environment --------------------------------------------------
var jwtSecret   = Environment.GetEnvironmentVariable("JWT_SECRET")   ?? throw new InvalidOperationException("JWT_SECRET not set");
var jwtIssuer   = Environment.GetEnvironmentVariable("JWT_ISSUER")   ?? "crout-automations-api";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "crout-automations-client";
var jwtExpiry   = int.Parse(Environment.GetEnvironmentVariable("JWT_EXPIRY_HOURS") ?? "8");
var hmacSecret  = Environment.GetEnvironmentVariable("HMAC_SECRET")  ?? throw new InvalidOperationException("HMAC_SECRET not set");

// -- CORS allowed origins -----------------------------------------------------
var rawOrigins     = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")
                     ?? "http://localhost:4200,http://localhost:4201";
var allowedOrigins = rawOrigins
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

// -- Helpers ------------------------------------------------------------------
builder.Services.AddSingleton(new DbHelper());
builder.Services.AddSingleton(new JwtHelper(jwtSecret, jwtIssuer, jwtAudience, jwtExpiry));
builder.Services.AddSingleton(new EncryptionHelper(hmacSecret));
builder.Services.AddSingleton(new SensitiveDataProtector(hmacSecret));
builder.Services.AddSingleton<ReleaseNotesHtmlSanitizer>();

// -- Repositories -------------------------------------------------------------
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IPasswordResetRepository, PasswordResetRepository>();
builder.Services.AddScoped<ICompanyRepository, CompanyRepository>();
builder.Services.AddScoped<IServiceRepository, ServiceRepository>();
builder.Services.AddScoped<IUserServiceRepository, UserServiceRepository>();
builder.Services.AddScoped<IServiceRequestRepository, ServiceRequestRepository>();
builder.Services.AddScoped<IContactRequestRepository, ContactRequestRepository>();
builder.Services.AddScoped<IPackageRepository, PackageRepository>();
builder.Services.AddScoped<IAddonRepository, AddonRepository>();
builder.Services.AddScoped<IServiceFeatureRepository, ServiceFeatureRepository>();
builder.Services.AddScoped<IServiceTriggerRepository, ServiceTriggerRepository>();
builder.Services.AddScoped<ICustomFormShareLinkRepository, CustomFormShareLinkRepository>();
builder.Services.AddScoped<IVideoProjectRepository, VideoProjectRepository>();
builder.Services.AddScoped<IDevServiceRepository, DevServiceRepository>();
builder.Services.AddScoped<IDevPortalRepository, DevPortalRepository>();
builder.Services.AddScoped<IIntegrationRepository, IntegrationRepository>();
builder.Services.AddScoped<IIntegrationDefinitionRepository, IntegrationDefinitionRepository>();
builder.Services.AddScoped<IUserServiceCredentialRepository, UserServiceCredentialRepository>();
builder.Services.AddScoped<IReleaseNoteRepository, ReleaseNoteRepository>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IBookingCalendarSettingsRepository, BookingCalendarSettingsRepository>();

// -- Application Services -----------------------------------------------------
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IServiceCatalogService, ServiceCatalogService>();
builder.Services.AddScoped<IServiceRequestService, ServiceRequestService>();
builder.Services.AddScoped<IServiceTriggerService, ServiceTriggerService>();
builder.Services.AddScoped<ICustomFormShareLinkService, CustomFormShareLinkService>();
builder.Services.AddScoped<IPublicFormAccessService, PublicFormAccessService>();
builder.Services.AddScoped<IDevUserServiceFormService, DevUserServiceFormService>();
builder.Services.AddScoped<IIntegrationDefinitionService, IntegrationDefinitionService>();
builder.Services.AddScoped<IVideoProjectService, VideoProjectService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IContactRequestService, ContactRequestService>();
builder.Services.AddScoped<IIntegrationService, IntegrationService>();
builder.Services.AddScoped<ISqlUpdaterService, SqlUpdaterService>();
builder.Services.AddScoped<IReleaseNoteService, ReleaseNoteService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IBookingCalendarSettingsService, BookingCalendarSettingsService>();
builder.Services.Configure<DatabaseManagementOptions>(builder.Configuration.GetSection("DatabaseManagement"));
builder.Services.AddScoped<IDatabaseManagementService, DatabaseManagementService>();
builder.Services.AddScoped<ISchemaSyncPlanService, SchemaSyncPlanService>();

builder.Services.Configure<N8nOptions>(options =>
{
    builder.Configuration.GetSection("N8n").Bind(options);
    options.BaseUrl = Environment.GetEnvironmentVariable("N8N_BASE_URL") ?? options.BaseUrl;
    options.ApiKey = Environment.GetEnvironmentVariable("N8N_APIKEY")
        ?? Environment.GetEnvironmentVariable("N8N_API_KEY")
        ?? options.ApiKey;
    options.WorkspaceId = Environment.GetEnvironmentVariable("N8N_WORKSPACEID") ?? options.WorkspaceId;
    options.DefaultProjectId = Environment.GetEnvironmentVariable("N8N_DEFAULTPROJECTID") ?? options.DefaultProjectId;
});
builder.Services.AddHttpClient<IN8nWorkflowClient, N8nWorkflowClient>();
builder.Services.AddScoped<N8nTemplateWorkflowService>();

// -- Custom Form share links ---------------------------------------------------
// AppBaseUrl defaults to the SPA's existing production origin — no new subdomain/DNS
// is introduced by this feature (see openspec/changes/custom-form-share-links/design.md D7).
builder.Services.Configure<CustomFormShareLinkOptions>(options =>
{
    options.AppBaseUrl = Environment.GetEnvironmentVariable("APP_BASE_URL") ?? options.AppBaseUrl;
    var expiryDays = Environment.GetEnvironmentVariable("SHARE_LINK_EXPIRY_DAYS");
    if (int.TryParse(expiryDays, out var parsedExpiryDays) && parsedExpiryDays > 0)
        options.ExpiryDays = parsedExpiryDays;
    // Defaults OFF everywhere, including production, until the R12 security review is done
    // (see CustomFormShareLinkOptions and tasks.md 8.1/8.2). Set to "true" per-environment
    // only after that review to actually expose the feature.
    options.Enabled = string.Equals(
        Environment.GetEnvironmentVariable("CUSTOM_FORM_SHARE_LINKS_ENABLED"), "true", StringComparison.OrdinalIgnoreCase);
});

// -- Paystack proxy -----------------------------------------------------------
// Uses a named HttpClient scoped to the Paystack base URL.
// Secret key is read from PAYSTACK_SECRET_KEY env var or appsettings Paystack:SecretKey.
builder.Services.AddHttpClient<IPaystackProxyService, PaystackProxyService>(client =>
{
    client.BaseAddress = new Uri("https://api.paystack.co");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// -- JWT Auth -----------------------------------------------------------------
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
  .AddJwtBearer(o =>
  {
    o.TokenValidationParameters = new TokenValidationParameters
    {
      ValidateIssuer           = true,
      ValidateAudience         = true,
      ValidateLifetime         = true,
      ValidateIssuerSigningKey = true,
      ValidIssuer              = jwtIssuer,
      ValidAudience            = jwtAudience,
      IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
      NameClaimType            = "unique_name",
      RoleClaimType            = "role",
    };
    o.Events = new JwtBearerEvents
    {
      OnMessageReceived = ctx =>
      {
        if (!string.IsNullOrWhiteSpace(ctx.Token))
        {
          return Task.CompletedTask;
        }

        if (ctx.Request.Cookies.TryGetValue("ca_jwt", out var cookieToken) &&
            !string.IsNullOrWhiteSpace(cookieToken))
        {
          ctx.Token = cookieToken;
        }

        return Task.CompletedTask;
      },
      OnTokenValidated = async ctx =>
      {
        var principal = ctx.Principal;
        if (principal is null)
        {
          ctx.Fail("Missing principal.");
          return;
        }

        var tokenVersionClaim = principal.FindFirst("token_version")?.Value;
        if (!int.TryParse(tokenVersionClaim, out var tokenVersion))
        {
          ctx.Fail("Missing token version.");
          return;
        }

        var repo = ctx.HttpContext.RequestServices.GetRequiredService<IUserRepository>();
        var user = await repo.GetByIdAsync(JwtHelper.GetUserId(principal));
        if (user is null || !user.Active || user.TokenVersion != tokenVersion)
        {
          ctx.Fail("Token revoked.");
        }
      }
    };
  });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
  options.AddDefaultPolicy(policy =>
  {
    policy
      .WithOrigins(allowedOrigins)
      .AllowAnyMethod()
      .AllowAnyHeader()
      .AllowCredentials();
  });
});

// -- Rate limiting for the public Custom Form share-link endpoints ------------
// No rate limiting exists anywhere else in this API today; this is scoped only to
// /api/public/forms/** (design.md D4). A global limiter keyed by IP alone guards
// against a single source hammering across tokens; the named per-action policies
// below layer a token+IP composite limit on top, so neither dimension alone can be
// starved by the other.
builder.Services.AddRateLimiter(options =>
{
  options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

  options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
  {
    if (!httpContext.Request.Path.StartsWithSegments("/api/public/forms"))
      return RateLimitPartition.GetNoLimiter("not-public-forms");

    var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
    {
      PermitLimit = 120,
      Window = TimeSpan.FromMinutes(1),
      QueueLimit = 0
    });
  });

  options.AddPolicy(RateLimiting.PublicFormsReadPolicy, httpContext =>
    RateLimitPartition.GetSlidingWindowLimiter(PublicFormsPartitionKey(httpContext), _ => new SlidingWindowRateLimiterOptions
    {
      PermitLimit = 30,
      Window = TimeSpan.FromMinutes(1),
      SegmentsPerWindow = 6,
      QueueLimit = 0
    }));

  options.AddPolicy(RateLimiting.PublicFormsSubmitPolicy, httpContext =>
    RateLimitPartition.GetSlidingWindowLimiter(PublicFormsPartitionKey(httpContext), _ => new SlidingWindowRateLimiterOptions
    {
      PermitLimit = 5,
      Window = TimeSpan.FromMinutes(1),
      SegmentsPerWindow = 6,
      QueueLimit = 0
    }));
});

static string PublicFormsPartitionKey(HttpContext httpContext)
{
  var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
  var token = httpContext.Request.RouteValues.TryGetValue("token", out var routeToken)
    ? routeToken?.ToString() ?? "no-token"
    : "no-token";
  return $"{ip}:{token}";
}

var app = builder.Build();

// -- Global exception handler -------------------------------------------------
app.UseExceptionHandler(errApp =>
{
  errApp.Run(async ctx =>
  {
    ctx.Response.ContentType = "application/json";
    var feature = ctx.Features.Get<IExceptionHandlerFeature>();
    var ex      = feature?.Error;
    var isDev   = app.Environment.IsDevelopment();

    ctx.Response.StatusCode = ex switch
    {
      UnauthorizedAccessException => 403,
      KeyNotFoundException        => 404,
      ArgumentException           => 400,
      _                           => 500,
    };

    var payload = isDev
      ? new { error = ex?.Message, type = ex?.GetType().Name, stack = ex?.StackTrace }
      : (object)new { error = ex?.Message ?? "An unexpected error occurred." };

    await ctx.Response.WriteAsync(JsonSerializer.Serialize(payload));
  });
});

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.MapControllers();
app.Run();
