using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class CompanyRepository(DbHelper db) : ICompanyRepository
{
    private const string SelectCols =
        "company_id AS CompanyId, user_id AS UserId, CompanyName, Industry, VATNumber, RegistrationNumber, Email, Phone, Address, Active";

    public async Task<IEnumerable<Company>> GetByUserAsync(int userId)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<Company>(
            $"SELECT {SelectCols} FROM Companies WHERE user_id=@userId AND Active=1",
            new { userId });
    }

    // Self-service: only returns active records
    public async Task<Company?> GetByIdAsync(int companyId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<Company>(
            $"SELECT {SelectCols} FROM Companies WHERE company_id=@companyId AND Active=1",
            new { companyId });
    }

    // Admin: returns regardless of Active flag
    public async Task<Company?> AdminGetByIdAsync(int companyId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<Company>(
            $"SELECT {SelectCols} FROM Companies WHERE company_id=@companyId",
            new { companyId });
    }

    public async Task<int> CreateAsync(Company company)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            "INSERT INTO Companies (user_id, CompanyName, Industry, VATNumber, RegistrationNumber, Email, Phone, Address, Active) " +
            "VALUES (@UserId, @CompanyName, @Industry, @VATNumber, @RegistrationNumber, @Email, @Phone, @Address, @Active); " +
            "SELECT LAST_INSERT_ID();",
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

    // ── Admin methods ────────────────────────────────────────────────────────

    public async Task<(IEnumerable<Company> Items, int Total)> GetAllAsync(int page, int pageSize, string? search)
    {
        using var conn = db.GetConnection();
        var offset = (page - 1) * pageSize;
        var hasSearch = !string.IsNullOrWhiteSpace(search);
        var where = hasSearch
            ? "WHERE CompanyName LIKE @pattern OR Industry LIKE @pattern OR Email LIKE @pattern"
            : "";
        var pattern = $"%{search}%";

        var total = await conn.ExecuteScalarAsync<int>(
            $"SELECT COUNT(1) FROM Companies {where}",
            new { pattern });

        var items = await conn.QueryAsync<Company>(
            $"SELECT {SelectCols} FROM Companies {where} ORDER BY CompanyId DESC LIMIT @pageSize OFFSET @offset",
            new { pattern, pageSize, offset });

        return (items, total);
    }

    public async Task AdminUpdateAsync(Company company)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE Companies SET CompanyName=@CompanyName, Industry=@Industry, VATNumber=@VATNumber, RegistrationNumber=@RegistrationNumber, Email=@Email, Phone=@Phone, Address=@Address, Active=@Active, user_id=@UserId WHERE company_id=@CompanyId",
            company);
    }

    public async Task AdminDeleteAsync(int companyId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("DELETE FROM Companies WHERE company_id=@companyId", new { companyId });
    }
}
