using CroutApi.DTOs;

namespace CroutApi.Services;

public interface ICustomFormShareLinkService
{
    Task<CustomFormShareLinkStatusDto> GetStatusAsync(int userId, int companyId, int userServiceId);

    /// <summary>Creates a new link, replacing (revoking) any prior active one for the form. Also covers "regenerate" — see design.md D2.</summary>
    Task<CustomFormShareLinkGeneratedDto> GenerateAsync(int userId, int companyId, int userServiceId, GenerateCustomFormShareLinkRequestDto request);

    Task RevokeAsync(int userId, int companyId, int userServiceId);

    /// <summary>
    /// System-side revoke with no ownership/access check, for use when a service itself
    /// transitions to inactive (disabled, deleted, or marked unpaid) — see design.md D10 and
    /// the spec's "Automatic invalidation..." requirement. Safe to call even if no active
    /// link exists (no-op).
    /// </summary>
    Task InvalidateForDeactivatedServiceAsync(int userServiceId);
}
