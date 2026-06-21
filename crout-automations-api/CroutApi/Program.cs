using CroutApi.Helpers;
using CroutApi.Repositories;
using CroutApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

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

// -- Repositories -------------------------------------------------------------
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ICompanyRepository, CompanyRepository>();
builder.Services.AddScoped<IServiceRepository, ServiceRepository>();
builder.Services.AddScoped<IUserServiceRepository, UserServiceRepository>();
builder.Services.AddScoped<IServiceRequestRepository, ServiceRequestRepository>();
builder.Services.AddScoped<IPackageRepository, PackageRepository>();
builder.Services.AddScoped<IAddonRepository, AddonRepository>();
builder.Services.AddScoped<IServiceFeatureRepository, ServiceFeatureRepository>();
builder.Services.AddScoped<IServiceTriggerRepository, ServiceTriggerRepository>();
builder.Services.AddScoped<IVideoProjectRepository, VideoProjectRepository>();

// -- Application Services -----------------------------------------------------
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IServiceCatalogService, ServiceCatalogService>();
builder.Services.AddScoped<IServiceRequestService, ServiceRequestService>();
builder.Services.AddScoped<IServiceTriggerService, ServiceTriggerService>();
builder.Services.AddScoped<IVideoProjectService, VideoProjectService>();

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
app.MapControllers();
app.Run();
