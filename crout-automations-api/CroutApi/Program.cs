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
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
  p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
