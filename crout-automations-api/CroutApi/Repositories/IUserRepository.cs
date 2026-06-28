using CroutApi.DTOs.Services;
using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IUserRepository
{
    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(int userId);
    Task<User?> GetActiveDeveloperByReferralAsync(string referral);
    Task<bool> UsernameExistsAsync(string username);
    Task<bool> EmailExistsAsync(string email);
    Task<bool> ReferralExistsAsync(string referral, int? exceptUserId = null);
    Task<bool> IsActiveDeveloperReferralAsync(string referral);
    Task<IEnumerable<DeveloperReferralOptionDto>> GetActiveDeveloperReferralOptionsAsync();
    Task<int> CreateAsync(User user);
    Task UpdateAsync(User user);
    Task AdminUpdateAsync(User user);
    Task UpdatePasswordAsync(int userId, string passwordHash);
    Task IncrementTokenVersionAsync(int userId);
    Task UpdatePictureAsync(int userId, string? pictureData);

    // Admin
    Task<(IEnumerable<User> Items, int Total)> GetAllAsync(int page, int pageSize, string? search, bool? isDev = null);
    Task SetActiveAsync(int userId, bool active);
    Task SetAdminAsync(int userId, bool isAdmin);
    Task DeleteAsync(int userId);
}
