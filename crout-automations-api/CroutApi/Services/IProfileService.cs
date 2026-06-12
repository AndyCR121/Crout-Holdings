using CroutApi.DTOs.Auth;
using CroutApi.DTOs.Company;
using CroutApi.DTOs.Profile;
using CroutApi.Models;

namespace CroutApi.Services;

public interface IProfileService
{
    Task<UserDto?> GetProfileAsync(int userId);
    Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    Task ChangePasswordAsync(int userId, ChangePasswordRequest request);
    Task<UserDto> UpdateAvatarAsync(int userId, string base64Data);

    Task<IEnumerable<Company>> GetCompaniesAsync(int userId);
    Task<Company> AddCompanyAsync(int userId, UpsertCompanyRequest request);
    Task<Company> UpdateCompanyAsync(int userId, int companyId, UpsertCompanyRequest request);
    Task DeleteCompanyAsync(int userId, int companyId);
}
