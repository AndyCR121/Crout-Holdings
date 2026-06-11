using System.Security.Claims;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

/// <summary>
/// Alias controller so the frontend can call /api/users/{userId}/companies
/// and /api/companies/{companyId}/services — these simply delegate to the
/// same service layer used by ProfileController.
/// </summary>
[ApiController]
[Authorize]
public class CompaniesController(IProfileService profile, IServiceCatalogService catalog) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/users/{userId}/companies
    [HttpGet("api/users/{userId:int}/companies")]
    public async Task<IActionResult> GetByUser(int userId)
    {
        // Enforce that callers can only fetch their own companies
        if (userId != UserId && userId != 0) return Forbid();
        return Ok(await profile.GetCompaniesAsync(UserId));
    }

    // GET /api/companies  (own companies)
    [HttpGet("api/companies")]
    public async Task<IActionResult> GetOwn() =>
        Ok(await profile.GetCompaniesAsync(UserId));

    // GET /api/companies/{companyId}
    [HttpGet("api/companies/{companyId:int}")]
    public async Task<IActionResult> GetById(int companyId)
    {
        var companies = await profile.GetCompaniesAsync(UserId);
        var company = companies.FirstOrDefault(c => c.CompanyId == companyId);
        return company is null ? NotFound() : Ok(company);
    }

    // GET /api/companies/{companyId}/services
    [HttpGet("api/companies/{companyId:int}/services")]
    public async Task<IActionResult> GetCompanyServices(int companyId) =>
        Ok(await catalog.GetUserServicesAsync(companyId));
}
