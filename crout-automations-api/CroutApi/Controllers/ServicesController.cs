using System.Security.Claims;
using CroutApi.DTOs.Services;
using CroutApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Route("api/services")]
public class ServicesController(IServiceCatalogService catalog) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>GET /api/services — all service catalogue entries with their features</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await catalog.GetServicesAsync());

    /// <summary>GET /api/services/{id} — single service with its features</summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var service = await catalog.GetServiceByIdAsync(id);
        return service is null ? NotFound() : Ok(service);
    }

    /// <summary>GET /api/services/packages — all packages across all services (must be above {id:int}/packages)</summary>
    [HttpGet("packages")]
    public async Task<IActionResult> GetAllPackages() => Ok(await catalog.GetAllPackagesAsync());

    /// <summary>GET /api/services/{id}/addons</summary>
    [HttpGet("{id:int}/addons")]
    public async Task<IActionResult> GetAddons(int id) => Ok(await catalog.GetAddonsByServiceAsync(id));

    /// <summary>GET /api/services/pricing-components/required</summary>
    [HttpGet("pricing-components/required")]
    public async Task<IActionResult> GetRequiredPricingComponents() => Ok(await catalog.GetRequiredPricingComponentsAsync());

    /// <summary>GET /api/services/{id}/packages</summary>
    [HttpGet("{id:int}/packages")]
    public async Task<IActionResult> GetPackages(int id) => Ok(await catalog.GetPackagesByServiceAsync(id));

    /// <summary>GET /api/services/company/{companyId} — active UserServices for a company</summary>
    [HttpGet("company/{companyId:int}")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> GetByCompany(int companyId) =>
        Ok(await catalog.GetUserServicesAsync(UserId, companyId));

    /// <summary>POST /api/services/user-services — creates a UserServices row from a selected website configuration.</summary>
    [HttpPost("user-services")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> CreateUserService([FromBody] CreateUserServiceFromConfigDto dto)
    {
        var created = await catalog.CreateUserServiceAsync(UserId, dto);
        return Created($"/api/services/company/{created.CompanyId}", created);
    }

    /// <summary>PUT /api/services/user-services/{userServiceId}/config-request — stores a pending service config change.</summary>
    [HttpPut("user-services/{userServiceId:int}/config-request")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> RequestConfigChange(int userServiceId, [FromBody] RequestServiceConfigChangeDto dto)
    {
        var updated = await catalog.RequestConfigChangeAsync(UserId, userServiceId, dto);
        return Ok(updated);
    }

    /// <summary>PUT /api/services/user-services/{userServiceId}/credentials — sends credential values through the backend gateway and stores only metadata.</summary>
    [HttpPut("user-services/{userServiceId:int}/credentials")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> UpdateCredentials(int userServiceId, [FromBody] UpdateServiceCredentialsDto dto)
    {
        var updated = await catalog.UpdateCredentialsAsync(UserId, userServiceId, dto);
        return Ok(updated);
    }
}
