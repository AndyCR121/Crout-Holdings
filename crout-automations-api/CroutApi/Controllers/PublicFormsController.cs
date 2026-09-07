using System.Text.Json;
using CroutApi.Helpers;
using CroutApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace CroutApi.Controllers;

/// <summary>
/// Public, unauthenticated Custom Form access via a share-link token. Deliberately has no
/// [Authorize] and no dependency on JwtHelper — a share token is structurally incapable of
/// being processed by the JWT bearer pipeline (see design.md D1/D2, spec requirement
/// "Share token is scoped to exactly one action, not a session").
///
/// Every invalid-token path (never existed, expired, revoked, or unpublished form) returns
/// the exact same 404 shape via NotFound() below — never distinguish why (R9).
///
/// Gated by CustomFormShareLinkOptions.Enabled (CUSTOM_FORM_SHARE_LINKS_ENABLED env var,
/// defaults false everywhere) until the R12 security review is complete — see tasks.md 8.1/8.2.
/// While disabled, every route here 404s identically to an invalid token, so the feature's
/// code can deploy to production without being reachable there.
/// </summary>
[ApiController]
public class PublicFormsController(
    IPublicFormAccessService publicForms,
    IOptions<CustomFormShareLinkOptions> options) : ControllerBase
{
    private const string UnavailableMessage = "This link is no longer available.";

    [HttpGet("api/public/forms/{token}")]
    [EnableRateLimiting(RateLimiting.PublicFormsReadPolicy)]
    public async Task<IActionResult> Resolve(string token)
    {
        if (!options.Value.Enabled) return NotFound(new { error = UnavailableMessage });
        var form = await publicForms.ResolveAsync(token);
        return form is null ? NotFound(new { error = UnavailableMessage }) : Ok(form);
    }

    [HttpPost("api/public/forms/{token}/submit")]
    [EnableRateLimiting(RateLimiting.PublicFormsSubmitPolicy)]
    [RequestSizeLimit(2_000_000)]
    public async Task<IActionResult> Submit(string token, [FromBody] JsonElement payload)
    {
        if (!options.Value.Enabled) return NotFound(new { error = UnavailableMessage });
        var payloadJson = payload.ValueKind == JsonValueKind.Undefined ? "{}" : payload.GetRawText();
        var result = await publicForms.SubmitAsync(token, payloadJson);
        return result is null ? NotFound(new { error = UnavailableMessage }) : Ok(result);
    }
}
