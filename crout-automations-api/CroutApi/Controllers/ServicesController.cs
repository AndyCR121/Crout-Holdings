using CroutApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Route("api/services")]
public class ServicesController(IServiceCatalogService catalog) : ControllerBase
{
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

    /// <summary>GET /api/services/{id}/addons</summary>
    [HttpGet("{id:int}/addons")]
    public async Task<IActionResult> GetAddons(int id) => Ok(await catalog.GetAddonsByServiceAsync(id));

    /// <summary>GET /api/services/{id}/packages</summary>
    [HttpGet("{id:int}/packages")]
    public async Task<IActionResult> GetPackages(int id) => Ok(await catalog.GetPackagesByServiceAsync(id));

    /// <summary>GET /api/services/packages — all packages across all services</summary>
    [HttpGet("packages")]
    public async Task<IActionResult> GetAllPackages() => Ok(await catalog.GetAllPackagesAsync());

    /// <summary>GET /api/services/company/{companyId} — active UserServices for a company</summary>
    [HttpGet("company/{companyId:int}")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> GetByCompany(int companyId) =>
        Ok(await catalog.GetUserServicesAsync(companyId));
}
