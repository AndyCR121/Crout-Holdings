using CroutApi.Helpers;
using CroutApi.Repositories;
using CroutApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// -- Config from environment --------------------------------------------------
var jwtSecret   = Environment.GetEnvironmentVariable("JWT_SECRET")   ?? throw new InvalidOperationException("JWT_SECRET not set");
var jwtIssuer   = Environment.GetEnvironmentVariable("JWT_ISSUER")   ?? "crout-automations-api";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "crout-automations-client";
var jwtExpiry   = int.Parse(Environment.GetEnvironmentVariable("JWT_EXPIRY_HOURS") ?? "8");
var hmacSecret  = Environment.GetEnvironmentVariable("HMAC_SECRET")  ?? throw new InvalidOperationException("HMAC_SECRET not set");

// -- CORS allowed origins -----------------------------------------------------
// Set ALLOWED_ORIGINS in your .env / server environment as a comma-separated
// list of the exact origins your Angular app is served from, e.g.:
//   ALLOWED_ORIGINS=https://crout-automations.co.za,https://www.crout-automations.co.za,http://localhost:4200
//
// ⚠️  AllowAnyOrigin() is intentionally NOT used here.
//     The Angular client sends withCredentials:true (for HttpOnly JWT cookies).
//     Browsers reject credentialed cross-origin requests when the server
//     responds with Access-Control-Allow-Origin: * — a specific origin list
//     is required, paired with AllowCredentials().
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

// -- Application Services -----------------------------------------------------
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IServiceCatalogService, ServiceCatalogService>();
builder.Services.AddScoped<IServiceRequestService, ServiceRequestService>();

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
    };
  });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
  options.AddDefaultPolicy(policy =>
  {
    policy
      .WithOrigins(allowedOrigins)   // explicit origins — required for withCredentials
      .AllowAnyMethod()
      .AllowAnyHeader()
      .AllowCredentials();           // enables cookie / Authorization header pass-through
  });
});

var app = builder.Build();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
