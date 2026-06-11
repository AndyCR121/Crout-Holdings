using CroutApi.DTOs.Company;
using CroutApi.DTOs.Profile;
using CroutApi.Helpers;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController(IProfileService profile) : ControllerBase
{
    // JwtHelper.GetUserId reads the 'sub' claim, which is what JwtHelper.GenerateToken writes.
    // ClaimTypes.NameIdentifier is a different string and would always return null here.
    private int UserId => JwtHelper.GetUserId(User);

    /// <summary>GET /api/profile</summary>
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var dto = await profile.GetProfileAsync(UserId);
        return dto is null ? NotFound() : Ok(dto);
    }

    /// <summary>PUT /api/profile</summary>
    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateProfileRequest request)
    {
        var dto = await profile.UpdateProfileAsync(UserId, request);
        return Ok(dto);
    }

    /// <summary>POST /api/profile/change-password</summary>
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try
        {
            await profile.ChangePasswordAsync(UserId, request);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ── Companies ──────────────────────────────────────────────────────

    /// <summary>GET /api/profile/companies</summary>
    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies()
        => Ok(await profile.GetCompaniesAsync(UserId));

    /// <summary>POST /api/profile/companies</summary>
    [HttpPost("companies")]
    public async Task<IActionResult> AddCompany([FromBody] UpsertCompanyRequest request)
    {
        var company = await profile.AddCompanyAsync(UserId, request);
        return Created($"/api/profile/companies/{company.CompanyId}", company);
    }

    /// <summary>PUT /api/profile/companies/{companyId}</summary>
    [HttpPut("companies/{companyId:int}")]
    public async Task<IActionResult> UpdateCompany(int companyId, [FromBody] UpsertCompanyRequest request)
    {
        try
        {
            var company = await profile.UpdateCompanyAsync(UserId, companyId, request);
            return Ok(company);
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException)        { return NotFound(); }
    }

    /// <summary>DELETE /api/profile/companies/{companyId}</summary>
    [HttpDelete("companies/{companyId:int}")]
    public async Task<IActionResult> DeleteCompany(int companyId)
    {
        await profile.DeleteCompanyAsync(UserId, companyId);
        return NoContent();
    }
}
