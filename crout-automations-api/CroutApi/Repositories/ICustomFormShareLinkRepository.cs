using CroutApi.Models;

namespace CroutApi.Repositories;

public interface ICustomFormShareLinkRepository
{
    /// <summary>The current active (not revoked, not expired) link for a form, if any — regardless of who owns it.</summary>
    Task<CustomFormShareLink?> GetActiveByUserServiceIdAsync(int userServiceId);

    /// <summary>Resolves a presented token's hash to its link only if it is currently active. Null covers never-existed, expired, and revoked alike (R9).</summary>
    Task<CustomFormShareLink?> GetActiveByTokenHashAsync(string tokenHash);

    Task<int> CreateAsync(CustomFormShareLink link);

    /// <summary>Revokes every currently-active link for a form (used both for explicit revoke and for replace-on-regenerate).</summary>
    Task RevokeActiveByUserServiceIdAsync(int userServiceId);

    Task<int> CreateAccessAsync(CustomFormShareLinkAccess access);

    Task<(DateTime? LastUsedAtUtc, int SubmissionCount)> GetUsageAsync(int shareLinkId);
}
