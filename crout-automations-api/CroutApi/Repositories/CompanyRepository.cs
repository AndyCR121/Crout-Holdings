using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class CompanyRepository(DbHelper db) : ICompanyRepository
{
    public async Task<IEnumerable<Company>> GetByUserAsync(int userId)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<Company>(
            "SELECT company_id AS CompanyId, user_id AS UserId, CompanyName, Industry, VATNumber, RegistrationNumber, Email, Phone, Address, Active FROM Companies WHERE user_id=@userId AND Active=1",
            new { userId });
    }

    public async Task<Company?> GetByIdAsync(int companyId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<Company>(
            "SELECT company_id AS CompanyId, user_id AS UserId, CompanyName, Industry, VATNumber, RegistrationNumber, Email, Phone, Address, Active FROM Companies WHERE company_id=@companyId AND Active=1",
            new { companyId });
    }

    public async Task<int> CreateAsync(Company company)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            "INSERT INTO Companies (user_id, CompanyName, Industry, VATNumber, RegistrationNumber, Email, Phone, Address) VALUES (@UserId, @CompanyName, @Industry, @VATNumber, @RegistrationNumber, @Email, @Phone, @Address); SELECT LAST_INSERT_ID();",
            company);
    }

    public async Task UpdateAsync(Company company)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE Companies SET CompanyName=@CompanyName, Industry=@Industry, VATNumber=@VATNumber, RegistrationNumber=@RegistrationNumber, Email=@Email, Phone=@Phone, Address=@Address WHERE company_id=@CompanyId AND user_id=@UserId",
            company);
    }

    public async Task DeleteAsync(int companyId, int userId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE Companies SET Active=0 WHERE company_id=@companyId AND user_id=@userId",
            new { companyId, userId });
    }
}
