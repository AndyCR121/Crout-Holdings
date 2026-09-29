namespace CroutApi.Services;

/// <summary>
/// Bound from env var APP_BASE_URL in Program.cs, same pattern as N8nOptions.
/// See openspec/changes/custom-form-share-links/design.md D7 for why AppBaseUrl defaults where
/// it does.
/// Link validity itself is owner-chosen per generate request (1-365 days, see design.md D9 /
/// <see cref="DTOs.ShareLinkValidityLimits"/>) rather than a fixed option here.
/// There is no longer an Enabled/feature-flag setting — CUSTOM_FORM_SHARE_LINKS_ENABLED and
/// its check were removed per explicit instruction during local testing; see design.md's note
/// on this for the resulting risk (the R12 security review is now a process gate only, not a
/// code-enforced one).
/// </summary>
public class CustomFormShareLinkOptions
{
    public string AppBaseUrl { get; set; } = "https://automations.crout-holdings.com";
}
