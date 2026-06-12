using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IUserRepository
{
    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByIdAsync(int userId);
    Task<bool> UsernameExistsAsync(string username);
    Task<bool> EmailExistsAsync(string email);
    Task<int> CreateAsync(User user);
    Task UpdateAsync(User user);
    Task UpdatePasswordAsync(int userId, string passwordHash);

    // Admin
    Task<(IEnumerable<User> Items, int Total)> GetAllAsync(int page, int pageSize, string? search);
    Task SetActiveAsync(int userId, bool active);
    Task SetAdminAsync(int userId, bool isAdmin);
    Task DeleteAsync(int userId);
}
