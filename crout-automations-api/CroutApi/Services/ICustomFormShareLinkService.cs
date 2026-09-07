using CroutApi.DTOs;

namespace CroutApi.Services;

public interface ICustomFormShareLinkService
{
    Task<CustomFormShareLinkStatusDto> GetStatusAsync(int userId, int companyId, int userServiceId);

    /// <summary>Creates a new link, replacing (revoking) any prior active one for the form. Also covers "regenerate" — see design.md D2.</summary>
    Task<CustomFormShareLinkGeneratedDto> GenerateAsync(int userId, int companyId, int userServiceId);

    Task RevokeAsync(int userId, int companyId, int userServiceId);
}
