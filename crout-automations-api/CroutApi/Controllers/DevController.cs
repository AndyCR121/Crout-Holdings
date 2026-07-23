using System.Security.Claims;
using CroutApi.DTOs;
using CroutApi.Helpers;
using CroutApi.Repositories;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

namespace CroutApi.Controllers;

[ApiController]
[Route("api/dev")]
[Authorize]
public class DevController(
    IUserRepository users,
    IDevPortalRepository devPortal,
    IIntegrationService integrationService,
    IDevUserServiceFormService forms) : ControllerBase
{
    private int CallerId =>
        JwtHelper.GetUserId(User);

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        if (!await IsDeveloperAsync()) return Forbid();
        return Ok(await devPortal.GetDashboardAsync(CallerId));
    }

    [HttpGet("services/assigned")]
    public async Task<IActionResult> Assigned(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        if (!await IsDeveloperAsync()) return Forbid();
        var (items, total) = await devPortal.GetAssignedAsync(CallerId, page, pageSize, search);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("services/available")]
    public async Task<IActionResult> Available(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        if (!await IsDeveloperAsync()) return Forbid();
        var (items, total) = await devPortal.GetAvailableAsync(page, pageSize, search);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("services/{userServiceId:int}/guide")]
    public async Task<IActionResult> Guide(int userServiceId)
    {
        if (!await IsDeveloperAsync()) return Forbid();
        var guide = await devPortal.GetGuideAsync(CallerId, userServiceId);
        return guide is null ? NotFound(new { error = "Assigned service was not found." }) : Ok(guide);
    }

    [HttpPost("services/{userServiceId:int}/guide/step")]
    public async Task<IActionResult> UpdateGuideStep(int userServiceId, [FromBody] DevGuideStepUpdateDto dto)
    {
        if (!await IsDeveloperAsync()) return Forbid();
        if (dto.Step is < 1 or > 5) return BadRequest(new { error = "Guide step must be between 1 and 5." });
        var guide = await devPortal.UpdateGuideStepAsync(CallerId, userServiceId, dto.Step);
        return guide is null ? NotFound(new { error = "Assigned service was not found." }) : Ok(guide);
    }

    [HttpPost("services/{userServiceId:int}/guide/integrations")]
    public async Task<IActionResult> UpdateGuideIntegrations(int userServiceId, [FromBody] DevGuideIntegrationsUpdateDto dto)
    {
        if (!await IsDeveloperAsync()) return Forbid();
        var guide = await devPortal.UpdateGuideIntegrationsAsync(CallerId, userServiceId, dto);
        if (guide is not null)
            await integrationService.SynchronizeAsync(userServiceId);
        return guide is null ? NotFound(new { error = "Assigned service was not found." }) : Ok(guide);
    }

    [HttpPost("services/{userServiceId:int}/maintenance")]
    public async Task<IActionResult> UpdateMaintenance(int userServiceId, [FromBody] DevMaintenanceUpdateDto dto)
    {
        if (!await IsDeveloperAsync()) return Forbid();
        var guide = await devPortal.UpdateMaintenanceAsync(CallerId, userServiceId, dto.IsMaintenance);
        return guide is null ? NotFound(new { error = "Assigned service was not found." }) : Ok(guide);
    }

    [HttpPost("services/{userServiceId:int}/claim")]
    public async Task<IActionResult> Claim(int userServiceId)
    {
        if (!await IsDeveloperAsync()) return Forbid();
        try
        {
            var id = await devPortal.ClaimAsync(CallerId, userServiceId);
            if (id <= 0) return Conflict(new { error = "This service is no longer available." });
            return Ok(new { devServiceId = id });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return Conflict(new { error = "This service is no longer available." });
        }
    }

    [HttpGet("user-services/{userServiceId:int}/form")]
    public async Task<IActionResult> GetForm(int userServiceId)
    {
        if (!await IsDeveloperAsync()) return Forbid();
        var form = await forms.GetAsync(CallerId, userServiceId);
        return form is null ? NotFound(new { error = "No custom form has been created for this service yet." }) : Ok(form);
    }

    [HttpGet("user-services/{userServiceId:int}/integration/status")]
    public async Task<IActionResult> IntegrationStatus(int userServiceId)
    {
        if (!await IsDeveloperAsync()) return Forbid();
        var guide = await devPortal.GetGuideAsync(CallerId, userServiceId);
        if (guide is null) return NotFound(new { error = "Assigned service was not found." });
        return Ok(await integrationService.GetStatusAsync(userServiceId));
    }

    [HttpPost("services/{userServiceId:int}/integration/publish")]
    public async Task<IActionResult> PublishIntegration(int userServiceId)
    {
        if (!await IsDeveloperAsync()) return Forbid();
        var guide = await devPortal.GetGuideAsync(CallerId, userServiceId);
        if (guide is null) return NotFound(new { error = "Assigned service was not found." });
        return Ok(await integrationService.PublishAsync(userServiceId, CallerId));
    }

    [HttpPost("user-services/{userServiceId:int}/form")]
    public async Task<IActionResult> CreateForm(int userServiceId, [FromBody] UpsertDevUserServiceFormDto dto)
    {
        if (!await IsDeveloperAsync()) return Forbid();
        return Ok(await forms.CreateAsync(CallerId, userServiceId, dto));
    }

    [HttpPut("user-services/{userServiceId:int}/form")]
    public async Task<IActionResult> UpdateForm(int userServiceId, [FromBody] UpsertDevUserServiceFormDto dto)
    {
        if (!await IsDeveloperAsync()) return Forbid();
        return Ok(await forms.UpdateAsync(CallerId, userServiceId, dto));
    }

    [HttpDelete("user-services/{userServiceId:int}/form")]
    public async Task<IActionResult> DeleteForm(int userServiceId)
    {
        if (!await IsDeveloperAsync()) return Forbid();
        await forms.DeleteAsync(CallerId, userServiceId);
        return NoContent();
    }

    private async Task<bool> IsDeveloperAsync()
    {
        var user = await users.GetByIdAsync(CallerId);
        return user is { Active: true, IsDev: true };
    }
}
