using System.Security.Claims;
using CroutApi.DTOs;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/integration-definitions")]
public class IntegrationDefinitionsController(IIntegrationDefinitionService definitions) : ControllerBase
{
    private bool IsAdmin =>
        string.Equals(
            User.FindFirstValue("is_admin"),
            "true",
            StringComparison.OrdinalIgnoreCase);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool activeOnly = false)
    {
        if (!IsAdmin) return Forbid();
        return Ok(await definitions.GetAllAsync(activeOnly));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertIntegrationDefinitionDto dto)
    {
        if (!IsAdmin) return Forbid();
        return Ok(await definitions.CreateAsync(dto));
    }

    [HttpPut("{integrationId:int}")]
    public async Task<IActionResult> Update(int integrationId, [FromBody] UpsertIntegrationDefinitionDto dto)
    {
        if (!IsAdmin) return Forbid();
        return Ok(await definitions.UpdateAsync(integrationId, dto));
    }

    [HttpDelete("{integrationId:int}")]
    public async Task<IActionResult> Delete(int integrationId)
    {
        if (!IsAdmin) return Forbid();
        await definitions.DeleteAsync(integrationId);
        return NoContent();
    }
}
