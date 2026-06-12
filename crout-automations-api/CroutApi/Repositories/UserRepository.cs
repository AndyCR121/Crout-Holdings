using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class UserRepository(DbHelper db) : IUserRepository
{
    public async Task<User?> GetByUsernameAsync(string username)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<User>(
            "SELECT user_id AS UserId, Username, PasswordHash, FirstName, Surname, Email, CellNumber, Active, IsAdmin FROM Users WHERE Username = @username AND Active = 1",
            new { username });
    }

    public async Task<User?> GetByIdAsync(int userId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<User>(
            "SELECT user_id AS UserId, Username, PasswordHash, FirstName, Surname, Email, CellNumber, Active, IsAdmin FROM Users WHERE user_id = @userId",
            new { userId });
    }

    public async Task<bool> UsernameExistsAsync(string username)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM Users WHERE Username = @username", new { username }) > 0;
    }

    public async Task<bool> EmailExistsAsync(string email)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM Users WHERE Email = @email", new { email }) > 0;
    }

    public async Task<int> CreateAsync(User user)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            "INSERT INTO Users (Username, PasswordHash, FirstName, Surname, Email, CellNumber, Active, IsAdmin) VALUES (@Username, @PasswordHash, @FirstName, @Surname, @Email, @CellNumber, @Active, @IsAdmin); SELECT LAST_INSERT_ID();",
            user);
    }

    // Self-service profile update — does NOT change Active or IsAdmin
    public async Task UpdateAsync(User user)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE Users SET FirstName=@FirstName, Surname=@Surname, Email=@Email, CellNumber=@CellNumber WHERE user_id=@UserId",
            user);
    }

    // Admin full update — also sets Active and IsAdmin
    public async Task AdminUpdateAsync(User user)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE Users SET FirstName=@FirstName, Surname=@Surname, Email=@Email, CellNumber=@CellNumber, Active=@Active, IsAdmin=@IsAdmin WHERE user_id=@UserId",
            user);
    }

    public async Task UpdatePasswordAsync(int userId, string passwordHash)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE Users SET PasswordHash=@passwordHash WHERE user_id=@userId",
            new { userId, passwordHash });
    }

    // ── Admin methods ────────────────────────────────────────────────────────

    public async Task<(IEnumerable<User> Items, int Total)> GetAllAsync(int page, int pageSize, string? search)
    {
        using var conn = db.GetConnection();
        var offset = (page - 1) * pageSize;
        var hasSearch = !string.IsNullOrWhiteSpace(search);
        var where = hasSearch
            ? "WHERE Username LIKE @pattern OR Email LIKE @pattern OR FirstName LIKE @pattern OR Surname LIKE @pattern"
            : "";
        var pattern = $"%{search}%";

        var total = await conn.ExecuteScalarAsync<int>(
            $"SELECT COUNT(1) FROM Users {where}",
            new { pattern });

        var items = await conn.QueryAsync<User>(
            $"SELECT user_id AS UserId, Username, FirstName, Surname, Email, CellNumber, Active, IsAdmin FROM Users {where} ORDER BY UserId DESC LIMIT @pageSize OFFSET @offset",
            new { pattern, pageSize, offset });

        return (items, total);
    }

    public async Task SetActiveAsync(int userId, bool active)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("UPDATE Users SET Active=@active WHERE user_id=@userId", new { active, userId });
    }

    public async Task SetAdminAsync(int userId, bool isAdmin)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("UPDATE Users SET IsAdmin=@isAdmin WHERE user_id=@userId", new { isAdmin, userId });
    }

    public async Task DeleteAsync(int userId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("DELETE FROM Users WHERE user_id=@userId", new { userId });
    }
}
