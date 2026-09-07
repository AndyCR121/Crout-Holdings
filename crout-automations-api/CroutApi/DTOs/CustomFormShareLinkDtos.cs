using CroutApi.DTOs.ServiceTriggers;

namespace CroutApi.DTOs;

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
}

/// <summary>Returned only from the generate call — the one response that ever contains the raw URL.</summary>
public class CustomFormShareLinkGeneratedDto
{
    public string Url { get; set; } = string.Empty;
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
