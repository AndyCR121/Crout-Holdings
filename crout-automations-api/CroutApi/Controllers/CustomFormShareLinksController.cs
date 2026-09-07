using CroutApi.Helpers;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace CroutApi.Controllers;

/// <summary>
/// Owner-facing Custom Form share-link lifecycle — [Authorize]'d, deliberately separate from
/// PublicFormsController so the two surfaces stay trivially distinguishable for the R12
/// security review (see design.md D2).
/// </summary>
[ApiController]
[Authorize]
public class CustomFormShareLinksController(
    ICustomFormShareLinkService shareLinks,
    IOptions<CustomFormShareLinkOptions> options) : ControllerBase
{
    private int UserId => JwtHelper.GetUserId(User);

    [HttpGet("api/companies/{companyId:int}/services/{userServiceId:int}/share-link")]
    public async Task<IActionResult> GetStatus(int companyId, int userServiceId) =>
        Ok(await shareLinks.GetStatusAsync(UserId, companyId, userServiceId));

    [HttpPost("api/companies/{companyId:int}/services/{userServiceId:int}/share-link/generate")]
    public async Task<IActionResult> Generate(int companyId, int userServiceId)
    {
        // Blocked pre-R12-review (see PublicFormsController's own gate): no point minting a
        // link that the public endpoint will refuse to serve anyway.
        if (!options.Value.Enabled)
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "Share links are not yet available." });
        return Ok(await shareLinks.GenerateAsync(UserId, companyId, userServiceId));
    }

    [HttpPost("api/companies/{companyId:int}/services/{userServiceId:int}/share-link/revoke")]
    public async Task<IActionResult> Revoke(int companyId, int userServiceId)
    {
        await shareLinks.RevokeAsync(UserId, companyId, userServiceId);
        return NoContent();
    }
}
