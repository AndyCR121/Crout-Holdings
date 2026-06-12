using System.Security.Claims;
using CroutApi.Models;
using CroutApi.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminController(IUserRepository users, ICompanyRepository companies) : ControllerBase
{
    private int CallerId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub")
                  ?? throw new InvalidOperationException("sub claim missing"));

    private bool CallerIsAdmin =>
        string.Equals(
            User.FindFirstValue("is_admin"),
            "true",
            StringComparison.OrdinalIgnoreCase);

    // ── Users ────────────────────────────────────────────────────────────────

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        if (!CallerIsAdmin) return Forbid();
        var (items, total) = await users.GetAllAsync(page, pageSize, search);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("users/{id:int}")]
    public async Task<IActionResult> GetUser(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        var user = await users.GetByIdAsync(id);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] User body)
    {
        if (!CallerIsAdmin) return Forbid();
        body.UserId = id;
        await users.UpdateAsync(body);
        var updated = await users.GetByIdAsync(id);
        return Ok(updated);
    }

    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        if (id == CallerId)
            return BadRequest(new { error = "Cannot delete your own account." });
        await users.DeleteAsync(id);
        return NoContent();
    }

    [HttpPatch("users/{id:int}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        if (id == CallerId)
            return BadRequest(new { error = "Cannot deactivate your own account." });
        var user = await users.GetByIdAsync(id);
        if (user is null) return NotFound();
        await users.SetActiveAsync(id, !user.Active);
        return Ok(new { active = !user.Active });
    }

    [HttpPatch("users/{id:int}/toggle-admin")]
    public async Task<IActionResult> ToggleAdmin(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        if (id == CallerId)
            return BadRequest(new { error = "Cannot change your own admin status." });
        var user = await users.GetByIdAsync(id);
        if (user is null) return NotFound();
        await users.SetAdminAsync(id, !user.IsAdmin);
        return Ok(new { isAdmin = !user.IsAdmin });
    }

    // ── Companies ────────────────────────────────────────────────────────────

    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        if (!CallerIsAdmin) return Forbid();
        var (items, total) = await companies.GetAllAsync(page, pageSize, search);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("companies/{id:int}")]
    public async Task<IActionResult> GetCompany(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        var company = await companies.GetByIdAsync(id);
        return company is null ? NotFound() : Ok(company);
    }

    [HttpPut("companies/{id:int}")]
    public async Task<IActionResult> UpdateCompany(int id, [FromBody] Company body)
    {
        if (!CallerIsAdmin) return Forbid();
        body.CompanyId = id;
        await companies.AdminUpdateAsync(body);
        var updated = await companies.GetByIdAsync(id);
        return Ok(updated);
    }

    [HttpDelete("companies/{id:int}")]
    public async Task<IActionResult> DeleteCompany(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        await companies.AdminDeleteAsync(id);
        return NoContent();
    }
}
