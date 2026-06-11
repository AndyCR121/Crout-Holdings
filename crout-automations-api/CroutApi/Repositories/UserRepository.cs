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
            "SELECT user_id AS UserId, Username, PasswordHash, FirstName, Surname, Email, CellNumber, Active, IsAdmin FROM Users WHERE user_id = @userId AND Active = 1",
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
            "INSERT INTO Users (Username, PasswordHash, FirstName, Surname, Email, CellNumber) VALUES (@Username, @PasswordHash, @FirstName, @Surname, @Email, @CellNumber); SELECT LAST_INSERT_ID();",
            user);
    }

    public async Task UpdateAsync(User user)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE Users SET FirstName=@FirstName, Surname=@Surname, Email=@Email, CellNumber=@CellNumber WHERE user_id=@UserId",
            user);
    }

    public async Task UpdatePasswordAsync(int userId, string passwordHash)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE Users SET PasswordHash=@passwordHash WHERE user_id=@userId",
            new { userId, passwordHash });
    }
}
