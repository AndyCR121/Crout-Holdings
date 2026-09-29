using System.ComponentModel.DataAnnotations;
using CroutApi.DTOs.ServiceTriggers;

namespace CroutApi.DTOs;

/// <summary>Owner-chosen validity bounds for a share link (design.md D9) — 365-day cap, no indefinite option.</summary>
public static class ShareLinkValidityLimits
{
    public const int MinDays = 1;
    public const int MaxDays = 365;
}

/// <summary>Owner-facing status of a service's share link. Never carries the URL/token — see design.md D1.</summary>
public class CustomFormShareLinkStatusDto
{
    public bool Exists { get; set; }
    public bool IsOwner { get; set; }
    public DateTime? CreatedAtUtc { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public DateTime? LastUsedAtUtc { get; set; }
    public int SubmissionCount { get; set; }
    public string? ShareMethod { get; set; }
    public List<string>? RecipientEmails { get; set; }
}

/// <summary>Request body for generating (or regenerating) a share link.</summary>
public class GenerateCustomFormShareLinkRequestDto
{
    /// <summary>"url" or "email" — see <see cref="Models.CustomFormShareMethods"/>.</summary>
    [Required]
    public string ShareMethod { get; set; } = Models.CustomFormShareMethods.Url;

    [Range(ShareLinkValidityLimits.MinDays, ShareLinkValidityLimits.MaxDays)]
    public int ValidityDays { get; set; } = ShareLinkValidityLimits.MaxDays;

    /// <summary>Required, non-empty, when <see cref="ShareMethod"/> is "email"; ignored for "url".</summary>
    public List<string>? RecipientEmails { get; set; }
}

/// <summary>
/// Returned only from the generate call. For "url", the one response that ever contains the
/// raw URL. For "email", Url is never populated — the link was sent directly to the
/// recipients instead (see design.md D8 and the spec's "Generating a share link" requirement).
/// </summary>
public class CustomFormShareLinkGeneratedDto
{
    public string ShareMethod { get; set; } = Models.CustomFormShareMethods.Url;
    public string? Url { get; set; }
    public List<string>? RecipientEmails { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
}

/// <summary>
/// What a public visitor receives for a valid token: light branding (D5) plus the exact same
/// ServiceTriggerConfigDto shape the authenticated in-portal renderer consumes, so the public
/// page can reuse identical field-rendering/validation logic rather than a parallel shape.
/// </summary>
public class PublicCustomFormDto
{
    public string CompanyName { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public ServiceTriggerConfigDto Config { get; set; } = null!;
}
