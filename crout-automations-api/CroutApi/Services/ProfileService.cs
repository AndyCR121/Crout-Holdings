using CroutApi.DTOs.Auth;
using CroutApi.DTOs.Company;
using CroutApi.DTOs.Profile;
using CroutApi.Helpers;
using CroutApi.Models;
using CroutApi.Repositories;

namespace CroutApi.Services;

public class ProfileService(
    IUserRepository users,
    ICompanyRepository companies,
    EncryptionHelper enc) : IProfileService
{
    public async Task<UserDto?> GetProfileAsync(int userId)
    {
        var user = await users.GetByIdAsync(userId);
        return user is null ? null : ToDto(user);
    }

    public async Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        var user = await users.GetByIdAsync(userId) ?? throw new KeyNotFoundException();
        user.FirstName  = request.FirstName;
        user.Surname    = request.Surname;
        user.Email      = request.Email;
        user.CellNumber = request.CellNumber;
        await users.UpdateAsync(user);
        return ToDto(user);
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var user = await users.GetByIdAsync(userId) ?? throw new KeyNotFoundException();
        if (user.PasswordHash != enc.Hash(request.CurrentPassword))
            throw new UnauthorizedAccessException("Current password is incorrect.");
        await users.UpdatePasswordAsync(userId, enc.Hash(request.NewPassword));
    }

    public async Task<UserDto> UpdateAvatarAsync(int userId, string base64Data)
    {
        await users.UpdatePictureAsync(userId, base64Data);
        var user = await users.GetByIdAsync(userId) ?? throw new KeyNotFoundException();
        return ToDto(user);
    }

    public async Task<IEnumerable<Company>> GetCompaniesAsync(int userId) =>
        await companies.GetByUserAsync(userId);

    public async Task<Company> AddCompanyAsync(int userId, UpsertCompanyRequest request)
    {
        var company = MapRequest(userId, request);
        company.CompanyId = await companies.CreateAsync(company);
        return company;
    }

    public async Task<Company> UpdateCompanyAsync(int userId, int companyId, UpsertCompanyRequest request)
    {
        var existing = await companies.GetByIdAsync(companyId) ?? throw new KeyNotFoundException();
        if (existing.UserId != userId) throw new UnauthorizedAccessException();
        var updated = MapRequest(userId, request);
        updated.CompanyId = companyId;
        await companies.UpdateAsync(updated);
        return updated;
    }

    public async Task DeleteCompanyAsync(int userId, int companyId) =>
        await companies.DeleteAsync(companyId, userId);

    private static Company MapRequest(int userId, UpsertCompanyRequest r) => new()
    {
        UserId = userId, CompanyName = r.CompanyName, Industry = r.Industry,
        VATNumber = r.VATNumber, RegistrationNumber = r.RegistrationNumber,
        Email = r.Email, Phone = r.Phone, Address = r.Address
    };

    private static UserDto ToDto(User u) =>
        new(u.UserId, u.Username, u.FirstName, u.Surname, u.Email, u.CellNumber, u.IsAdmin, u.ProfilePicture);
}
