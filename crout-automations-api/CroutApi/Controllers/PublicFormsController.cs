using System.Text.Json;
using CroutApi.Helpers;
using CroutApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

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
/// No longer gated by a feature flag — CUSTOM_FORM_SHARE_LINKS_ENABLED and its check were
/// removed per explicit instruction during local testing (see design.md's note on this).
/// The R12 security review (tasks.md 8.2) is still owed but is now a process gate only:
/// nothing in code stops this from being reachable in any environment, production included.
/// </summary>
[ApiController]
public class PublicFormsController(IPublicFormAccessService publicForms) : ControllerBase
{
    private const string UnavailableMessage = "This link is no longer available.";

    [HttpGet("api/public/forms/{token}")]
    [EnableRateLimiting(RateLimiting.PublicFormsReadPolicy)]
    public async Task<IActionResult> Resolve(string token)
    {
        var form = await publicForms.ResolveAsync(token);
        return form is null ? NotFound(new { error = UnavailableMessage }) : Ok(form);
    }

    [HttpPost("api/public/forms/{token}/submit")]
    [EnableRateLimiting(RateLimiting.PublicFormsSubmitPolicy)]
    [RequestSizeLimit(2_000_000)]
    public async Task<IActionResult> Submit(string token, [FromBody] JsonElement payload)
    {
        var payloadJson = payload.ValueKind == JsonValueKind.Undefined ? "{}" : payload.GetRawText();
        var result = await publicForms.SubmitAsync(token, payloadJson);
        return result is null ? NotFound(new { error = UnavailableMessage }) : Ok(result);
    }
}
