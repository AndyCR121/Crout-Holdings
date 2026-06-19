using CroutApi.DTOs;
using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class DevServiceRepository(DbHelper db) : IDevServiceRepository
{
    private const string JoinedSelect = """
        SELECT
          ds.devServiceId AS DevServiceId,
          ds.userId AS UserId,
          us.id AS UserServiceId,
          CONCAT(u.FirstName, ' ', u.Surname) AS DeveloperName,
          u.Email AS DeveloperEmail,
          u.referral AS Referral,
          c.company_id AS CompanyId,
          c.CompanyName AS CompanyName,
          s.service_id AS ServiceId,
          s.ServiceName AS ServiceName,
          us.subscription_id AS SubscriptionId,
          us.Status AS Status,
          COALESCE(ds.commissionPerc, 20.00) AS CommissionPerc,
          COALESCE(ds.cost, 0.00) AS Cost,
          COALESCE(ds.totalCommission, ROUND(COALESCE(ds.cost, 0.00) * (COALESCE(ds.commissionPerc, 20.00) / 100), 2)) AS TotalCommission,
          COALESCE(ds.isActive, 0) AS IsActive,
          COALESCE(ds.createdAt, us.CreatedAt) AS CreatedAt,
          ds.updatedAt AS UpdatedAt
        FROM UserServices us
        JOIN Companies c ON c.company_id = us.company_id
        JOIN Services s ON s.service_id = us.service_id
        LEFT JOIN DevServices ds ON ds.userServiceId = us.id
        LEFT JOIN Users u ON u.user_id = ds.userId
        """;

    public async Task<(IEnumerable<DevServiceViewDto> Items, int Total)> GetAllAsync(
        int page,
        int pageSize,
        string? search,
        int? developerId,
        int? companyId,
        int? serviceId,
        string? referral,
        bool? assigned,
        bool? active)
    {
        using var conn = db.GetConnection();
        var offset = (page - 1) * pageSize;
        var filters = new List<string>();

        if (!string.IsNullOrWhiteSpace(search))
            filters.Add("(c.CompanyName LIKE @pattern OR s.ServiceName LIKE @pattern OR u.FirstName LIKE @pattern OR u.Surname LIKE @pattern OR u.Email LIKE @pattern OR u.referral LIKE @pattern OR us.subscription_id LIKE @pattern)");
        if (developerId is not null) filters.Add("ds.userId = @developerId");
        if (companyId is not null) filters.Add("c.company_id = @companyId");
        if (serviceId is not null) filters.Add("s.service_id = @serviceId");
        if (!string.IsNullOrWhiteSpace(referral)) filters.Add("u.referral = @referral");
        if (assigned is true) filters.Add("ds.devServiceId IS NOT NULL");
        if (assigned is false) filters.Add("ds.devServiceId IS NULL");
        if (active is not null) filters.Add("ds.isActive = @active");

        var where = filters.Count > 0 ? $"WHERE {string.Join(" AND ", filters)}" : "";
        var args = new
        {
            pattern = $"%{search}%",
            developerId,
            companyId,
            serviceId,
            referral,
            active,
            pageSize,
            offset
        };

        var total = await conn.ExecuteScalarAsync<int>(
            $"SELECT COUNT(1) FROM ({JoinedSelect} {where}) q",
            args);

        var items = await conn.QueryAsync<DevServiceViewDto>(
            $"{JoinedSelect} {where} ORDER BY CreatedAt DESC LIMIT @pageSize OFFSET @offset",
            args);

        return (items, total);
    }

    public async Task<DevService?> GetByIdAsync(int devServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<DevService>(
            """
            SELECT
              devServiceId AS DevServiceId,
              userId AS UserId,
              userServiceId AS UserServiceId,
              commissionPerc AS CommissionPerc,
              cost AS Cost,
              totalCommission AS TotalCommission,
              isActive AS IsActive,
              createdAt AS CreatedAt,
              updatedAt AS UpdatedAt
            FROM DevServices
            WHERE devServiceId = @devServiceId
            """,
            new { devServiceId });
    }

    public async Task<int> CreateAsync(DevService devService)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO DevServices (userId, userServiceId, commissionPerc, cost, isActive)
            VALUES (@UserId, @UserServiceId, @CommissionPerc, @Cost, @IsActive);
            SELECT LAST_INSERT_ID();
            """,
            devService);
    }

    public async Task UpdateAsync(DevService devService)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE DevServices
            SET userId = @UserId,
                commissionPerc = @CommissionPerc,
                cost = @Cost,
                isActive = @IsActive
            WHERE devServiceId = @DevServiceId
            """,
            devService);
    }

    public async Task DeactivateAsync(int devServiceId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE DevServices SET isActive = 0 WHERE devServiceId = @devServiceId",
            new { devServiceId });
    }

    public async Task<bool> UserServiceExistsAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(1) FROM UserServices WHERE id = @userServiceId",
            new { userServiceId }) > 0;
    }
}
