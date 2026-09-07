namespace CroutApi.Services;

/// <summary>
/// Bound from env vars APP_BASE_URL / SHARE_LINK_EXPIRY_DAYS / CUSTOM_FORM_SHARE_LINKS_ENABLED
/// in Program.cs, same pattern as N8nOptions.
/// See openspec/changes/custom-form-share-links/design.md D7 for why AppBaseUrl defaults where
/// it does, and tasks.md 8.1/8.2 for why Enabled defaults to false: this is the app's first
/// unauthenticated internet-facing endpoint, gated on a dedicated security review (R12) before
/// it may be turned on in production. The code can deploy to any environment safely with this
/// left off; an operator opts in per-environment only after that review.
/// </summary>
public class CustomFormShareLinkOptions
{
    public string AppBaseUrl { get; set; } = "https://automations.crout-holdings.com";
    public int ExpiryDays { get; set; } = 365;
    public bool Enabled { get; set; } = false;
}
