using System.Security.Claims;
using CroutApi.DTOs;
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

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        if (!CallerIsAdmin) return Forbid();

        if (string.IsNullOrWhiteSpace(dto.Username) ||
            string.IsNullOrWhiteSpace(dto.Email) ||
            string.IsNullOrWhiteSpace(dto.FirstName) ||
            string.IsNullOrWhiteSpace(dto.Surname))
            return BadRequest(new { error = "Username, email, first name and surname are required." });

        if (await users.UsernameExistsAsync(dto.Username))
            return Conflict(new { error = "Username already exists." });

        if (await users.EmailExistsAsync(dto.Email))
            return Conflict(new { error = "Email already in use." });

        var user = new User
        {
            Username     = dto.Username.Trim(),
            FirstName    = dto.FirstName.Trim(),
            Surname      = dto.Surname.Trim(),
            Email        = dto.Email.Trim(),
            CellNumber   = dto.CellNumber?.Trim(),
            Active       = dto.Active,
            IsAdmin      = dto.IsAdmin,
            // Admin-created accounts get a placeholder hash; the user must
            // set their own password via the forgot-password / invite flow.
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
        };

        var newId = await users.CreateAsync(user);
        var created = await users.GetByIdAsync(newId);
        return CreatedAtAction(nameof(GetUser), new { id = newId }, created);
    }

    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] User body)
    {
        if (!CallerIsAdmin) return Forbid();
        body.UserId = id;
        await users.AdminUpdateAsync(body);
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

    [HttpPost("companies")]
    public async Task<IActionResult> CreateCompany([FromBody] CreateCompanyDto dto)
    {
        if (!CallerIsAdmin) return Forbid();

        if (string.IsNullOrWhiteSpace(dto.CompanyName))
            return BadRequest(new { error = "Company name is required." });

        var company = new Company
        {
            UserId             = dto.UserId,
            CompanyName        = dto.CompanyName.Trim(),
            Industry           = dto.Industry?.Trim(),
            VATNumber          = dto.VATNumber?.Trim(),
            RegistrationNumber = dto.RegistrationNumber?.Trim(),
            Email              = dto.Email?.Trim(),
            Phone              = dto.Phone?.Trim(),
            Address            = dto.Address?.Trim(),
            Active             = dto.Active,
        };

        var newId = await companies.CreateAsync(company);
        // Use AdminGetById (no Active filter) so we return the row regardless of status
        var created = await companies.AdminGetByIdAsync(newId);
        return CreatedAtAction(nameof(GetCompany), new { id = newId }, created);
    }

    [HttpPut("companies/{id:int}")]
    public async Task<IActionResult> UpdateCompany(int id, [FromBody] Company body)
    {
        if (!CallerIsAdmin) return Forbid();
        body.CompanyId = id;
        await companies.AdminUpdateAsync(body);
        var updated = await companies.AdminGetByIdAsync(id);
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
