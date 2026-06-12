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
public class AdminController(
    IUserRepository users,
    ICompanyRepository companies,
    IPackageRepository packages,
    IAddonRepository addons,
    IServiceFeatureRepository serviceFeatures,
    IServiceRepository services) : ControllerBase
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
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
        };

        var newId   = await users.CreateAsync(user);
        var created = await users.GetByIdAsync(newId);
        return CreatedAtAction(nameof(GetUser), new { id = newId }, created);
    }

    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] User body)
    {
        if (!CallerIsAdmin) return Forbid();
        body.UserId = id;
        await users.AdminUpdateAsync(body);
        return Ok(await users.GetByIdAsync(id));
    }

    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        if (id == CallerId) return BadRequest(new { error = "Cannot delete your own account." });
        await users.DeleteAsync(id);
        return NoContent();
    }

    [HttpPatch("users/{id:int}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        if (id == CallerId) return BadRequest(new { error = "Cannot deactivate your own account." });
        var user = await users.GetByIdAsync(id);
        if (user is null) return NotFound();
        await users.SetActiveAsync(id, !user.Active);
        return Ok(new { active = !user.Active });
    }

    [HttpPatch("users/{id:int}/toggle-admin")]
    public async Task<IActionResult> ToggleAdmin(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        if (id == CallerId) return BadRequest(new { error = "Cannot change your own admin status." });
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

        var newId   = await companies.CreateAsync(company);
        var created = await companies.AdminGetByIdAsync(newId);
        return CreatedAtAction(nameof(GetCompany), new { id = newId }, created);
    }

    [HttpPut("companies/{id:int}")]
    public async Task<IActionResult> UpdateCompany(int id, [FromBody] Company body)
    {
        if (!CallerIsAdmin) return Forbid();
        body.CompanyId = id;
        await companies.AdminUpdateAsync(body);
        return Ok(await companies.AdminGetByIdAsync(id));
    }

    [HttpDelete("companies/{id:int}")]
    public async Task<IActionResult> DeleteCompany(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        await companies.AdminDeleteAsync(id);
        return NoContent();
    }

    // ── Services (admin read) ─────────────────────────────────────────────────

    [HttpGet("services")]
    public async Task<IActionResult> GetServices(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (!CallerIsAdmin) return Forbid();
        var all     = (await services.GetAllAsync()).ToList();
        var total   = all.Count;
        var items   = all.Skip((page - 1) * pageSize).Take(pageSize);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("services/{id:int}")]
    public async Task<IActionResult> GetService(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        var svc = await services.GetByIdAsync(id);
        return svc is null ? NotFound() : Ok(svc);
    }

    // ── Packages ──────────────────────────────────────────────────────────────

    [HttpGet("packages")]
    public async Task<IActionResult> GetPackages(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (!CallerIsAdmin) return Forbid();
        var (items, total) = await packages.GetAllAsync(page, pageSize);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("packages/{id:int}")]
    public async Task<IActionResult> GetPackage(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        var pkg = await packages.GetByIdAsync(id);
        return pkg is null ? NotFound() : Ok(pkg);
    }

    [HttpPost("packages")]
    public async Task<IActionResult> CreatePackage([FromBody] Package body)
    {
        if (!CallerIsAdmin) return Forbid();
        if (string.IsNullOrWhiteSpace(body.PackageName))
            return BadRequest(new { error = "Package name is required." });
        var newId   = await packages.CreateAsync(body);
        var created = await packages.GetByIdAsync(newId);
        return CreatedAtAction(nameof(GetPackage), new { id = newId }, created);
    }

    [HttpPut("packages/{id:int}")]
    public async Task<IActionResult> UpdatePackage(int id, [FromBody] Package body)
    {
        if (!CallerIsAdmin) return Forbid();
        body.PackageId = id;
        await packages.UpdateAsync(body);
        return Ok(await packages.GetByIdAsync(id));
    }

    [HttpDelete("packages/{id:int}")]
    public async Task<IActionResult> DeletePackage(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        await packages.DeleteAsync(id);
        return NoContent();
    }

    [HttpPut("packages/{id:int}/services")]
    public async Task<IActionResult> LinkServicesToPackage(int id, [FromBody] LinkServicesToPackageDto dto)
    {
        if (!CallerIsAdmin) return Forbid();
        await packages.SetServiceLinksAsync(id, dto.ServiceIds);
        return Ok(new { packageId = id, serviceIds = dto.ServiceIds });
    }

    // ── Addons ────────────────────────────────────────────────────────────────

    [HttpGet("addons")]
    public async Task<IActionResult> GetAddons(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (!CallerIsAdmin) return Forbid();
        var (items, total) = await addons.GetAllAsync(page, pageSize);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("addons/{id:int}")]
    public async Task<IActionResult> GetAddon(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        var addon = await addons.GetByIdAsync(id);
        return addon is null ? NotFound() : Ok(addon);
    }

    [HttpPost("addons")]
    public async Task<IActionResult> CreateAddon([FromBody] IAddon body)
    {
        if (!CallerIsAdmin) return Forbid();
        if (string.IsNullOrWhiteSpace(body.AddonName))
            return BadRequest(new { error = "Addon name is required." });
        var newId   = await addons.CreateAsync(body);
        var created = await addons.GetByIdAsync(newId);
        return CreatedAtAction(nameof(GetAddon), new { id = newId }, created);
    }

    [HttpPut("addons/{id:int}")]
    public async Task<IActionResult> UpdateAddon(int id, [FromBody] IAddon body)
    {
        if (!CallerIsAdmin) return Forbid();
        body.AddonId = id;
        await addons.UpdateAsync(body);
        return Ok(await addons.GetByIdAsync(id));
    }

    [HttpDelete("addons/{id:int}")]
    public async Task<IActionResult> DeleteAddon(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        await addons.DeleteAsync(id);
        return NoContent();
    }

    // ── Service Features ──────────────────────────────────────────────────────

    [HttpGet("service-features")]
    public async Task<IActionResult> GetServiceFeatures(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? serviceId = null)
    {
        if (!CallerIsAdmin) return Forbid();
        var (items, total) = await serviceFeatures.GetAllAsync(page, pageSize, serviceId);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("service-features/{id:int}")]
    public async Task<IActionResult> GetServiceFeature(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        var feature = await serviceFeatures.GetByIdAsync(id);
        return feature is null ? NotFound() : Ok(feature);
    }

    [HttpPost("service-features")]
    public async Task<IActionResult> CreateServiceFeature([FromBody] ServiceFeature body)
    {
        if (!CallerIsAdmin) return Forbid();
        if (string.IsNullOrWhiteSpace(body.Feature))
            return BadRequest(new { error = "Feature text is required." });
        var newId   = await serviceFeatures.CreateAsync(body);
        var created = await serviceFeatures.GetByIdAsync(newId);
        return CreatedAtAction(nameof(GetServiceFeature), new { id = newId }, created);
    }

    [HttpPut("service-features/{id:int}")]
    public async Task<IActionResult> UpdateServiceFeature(int id, [FromBody] ServiceFeature body)
    {
        if (!CallerIsAdmin) return Forbid();
        body.FeatureId = id;
        await serviceFeatures.UpdateAsync(body);
        return Ok(await serviceFeatures.GetByIdAsync(id));
    }

    [HttpDelete("service-features/{id:int}")]
    public async Task<IActionResult> DeleteServiceFeature(int id)
    {
        if (!CallerIsAdmin) return Forbid();
        await serviceFeatures.DeleteAsync(id);
        return NoContent();
    }
}
