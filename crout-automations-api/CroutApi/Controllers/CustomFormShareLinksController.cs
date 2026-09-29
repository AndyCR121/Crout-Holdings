using CroutApi.DTOs;
using CroutApi.Helpers;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

/// <summary>
/// Owner-facing Custom Form share-link lifecycle — [Authorize]'d, deliberately separate from
/// PublicFormsController so the two surfaces stay trivially distinguishable for the R12
/// security review (see design.md D2).
///
/// No longer gated by a feature flag — see PublicFormsController's own note on the
/// CUSTOM_FORM_SHARE_LINKS_ENABLED removal.
/// </summary>
[ApiController]
[Authorize]
public class CustomFormShareLinksController(ICustomFormShareLinkService shareLinks) : ControllerBase
{
    private int UserId => JwtHelper.GetUserId(User);

    [HttpGet("api/companies/{companyId:int}/services/{userServiceId:int}/share-link")]
    public async Task<IActionResult> GetStatus(int companyId, int userServiceId) =>
        Ok(await shareLinks.GetStatusAsync(UserId, companyId, userServiceId));

    [HttpPost("api/companies/{companyId:int}/services/{userServiceId:int}/share-link/generate")]
    public async Task<IActionResult> Generate(int companyId, int userServiceId, [FromBody] GenerateCustomFormShareLinkRequestDto request)
    {
        try
        {
            return Ok(await shareLinks.GenerateAsync(UserId, companyId, userServiceId, request));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("api/companies/{companyId:int}/services/{userServiceId:int}/share-link/revoke")]
    public async Task<IActionResult> Revoke(int companyId, int userServiceId)
    {
        await shareLinks.RevokeAsync(UserId, companyId, userServiceId);
        return NoContent();
    }
}
