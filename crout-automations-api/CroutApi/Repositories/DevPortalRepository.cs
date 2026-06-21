using CroutApi.DTOs;
using CroutApi.Helpers;
using Dapper;

namespace CroutApi.Repositories;

public class DevPortalRepository(DbHelper db) : IDevPortalRepository
{
    private const string AssignedSelect = """
        SELECT
          ds.devServiceId AS DevServiceId,
          ds.userId AS UserId,
          us.id AS UserServiceId,
          c.company_id AS CompanyId,
          c.CompanyName AS CompanyName,
          c.Email AS CompanyEmail,
          c.Phone AS CompanyPhone,
          c.Address AS CompanyAddress,
          s.service_id AS ServiceId,
          s.ServiceName AS ServiceName,
          s.ServiceDescription AS ServiceDescription,
          us.subscription_id AS SubscriptionId,
          us.Status AS Status,
          us.Config AS Config,
          us.pricingSnapshot AS PricingSnapshot,
          COALESCE(us.devGuideStep, 0) AS GuideStep,
          COALESCE(us.isMaintenance, 0) AS IsMaintenance,
          COALESCE(ds.cost, us.subscriptionAmount, 0.00) AS SubscriptionAmount,
          ds.commissionPerc AS CommissionPerc,
          ds.totalCommission AS TotalCommission,
          ds.isActive AS IsActive,
          ds.createdAt AS CreatedAt,
          us.dueDate AS DueDate,
          us.paymentDate AS PaymentDate
        FROM DevServices ds
        JOIN UserServices us ON us.id = ds.userServiceId
        JOIN Companies c ON c.company_id = us.company_id
        JOIN Services s ON s.service_id = us.service_id
        """;

    private const string AvailableSelect = """
        SELECT
          NULL AS DevServiceId,
          NULL AS UserId,
          us.id AS UserServiceId,
          c.company_id AS CompanyId,
          c.CompanyName AS CompanyName,
          c.Email AS CompanyEmail,
          c.Phone AS CompanyPhone,
          c.Address AS CompanyAddress,
          s.service_id AS ServiceId,
          s.ServiceName AS ServiceName,
          s.ServiceDescription AS ServiceDescription,
          us.subscription_id AS SubscriptionId,
          us.Status AS Status,
          us.Config AS Config,
          us.pricingSnapshot AS PricingSnapshot,
          COALESCE(us.devGuideStep, 0) AS GuideStep,
          COALESCE(us.isMaintenance, 0) AS IsMaintenance,
          COALESCE(us.subscriptionAmount, 0.00) AS SubscriptionAmount,
          20.00 AS CommissionPerc,
          ROUND(COALESCE(us.subscriptionAmount, 0.00) * 0.20, 2) AS TotalCommission,
          0 AS IsActive,
          us.CreatedAt AS CreatedAt,
          us.dueDate AS DueDate,
          us.paymentDate AS PaymentDate
        FROM UserServices us
        JOIN Companies c ON c.company_id = us.company_id
        JOIN Services s ON s.service_id = us.service_id
        LEFT JOIN DevServices activeDs ON activeDs.userServiceId = us.id AND activeDs.isActive = 1
        """;

    public async Task<DevDashboardDto> GetDashboardAsync(int userId)
    {
        var (items, _) = await GetAssignedAsync(userId, 1, 6, null);
        var all = (await GetAssignedAsync(userId, 1, 1000, null)).Items.ToList();
        return new DevDashboardDto
        {
            AssignedCount = all.Count,
            LiveCount = all.Count(x => x.Status == 2),
            InDevelopmentCount = all.Count(x => x.Status == 1),
            PendingCount = all.Count(x => x.Status == 3),
            MonthlySubscriptionTotal = all.Sum(x => x.SubscriptionAmount),
            MonthlyCommissionTotal = all.Sum(x => x.TotalCommission),
            RecentAssigned = items
        };
    }

    public async Task<(IEnumerable<DevPortalServiceDto> Items, int Total)> GetAssignedAsync(int userId, int page, int pageSize, string? search)
    {
        using var conn = db.GetConnection();
        var offset = (page - 1) * pageSize;
        var filters = new List<string> { "ds.userId = @userId", "ds.isActive = 1", "us.Active = 1" };
        if (!string.IsNullOrWhiteSpace(search))
            filters.Add("(c.CompanyName LIKE @pattern OR s.ServiceName LIKE @pattern OR us.subscription_id LIKE @pattern)");
        var where = $"WHERE {string.Join(" AND ", filters)}";
        var args = new { userId, pattern = $"%{search}%", pageSize, offset };

        var total = await conn.ExecuteScalarAsync<int>($"SELECT COUNT(1) FROM ({AssignedSelect} {where}) q", args);
        var items = await conn.QueryAsync<DevPortalServiceDto>($"{AssignedSelect} {where} ORDER BY CreatedAt DESC LIMIT @pageSize OFFSET @offset", args);
        return (items, total);
    }

    public async Task<DevPortalServiceDto?> GetGuideAsync(int userId, int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<DevPortalServiceDto>(
            $"""
            {AssignedSelect}
            WHERE ds.userId = @userId
              AND ds.isActive = 1
              AND us.Active = 1
              AND us.id = @userServiceId
            """,
            new { userId, userServiceId });
    }

    public async Task<DevPortalServiceDto?> UpdateGuideStepAsync(int userId, int userServiceId, int step)
    {
        using var conn = db.GetConnection();
        var status = step switch
        {
            >= 13 => 2,
            >= 9 => 1,
            >= 2 => 1,
            _ => 3
        };

        var affected = await conn.ExecuteAsync(
            """
            UPDATE UserServices us
            JOIN DevServices ds ON ds.userServiceId = us.id
            SET us.devGuideStep = GREATEST(COALESCE(us.devGuideStep, 0), @step),
                us.Status = @status
            WHERE us.id = @userServiceId
              AND us.Active = 1
              AND ds.userId = @userId
              AND ds.isActive = 1
            """,
            new { userId, userServiceId, step, status });

        return affected == 0 ? null : await GetGuideAsync(userId, userServiceId);
    }

    public async Task<DevPortalServiceDto?> UpdateMaintenanceAsync(int userId, int userServiceId, bool isMaintenance)
    {
        using var conn = db.GetConnection();
        var affected = await conn.ExecuteAsync(
            """
            UPDATE UserServices us
            JOIN DevServices ds ON ds.userServiceId = us.id
            SET us.isMaintenance = @isMaintenance
            WHERE us.id = @userServiceId
              AND us.Active = 1
              AND ds.userId = @userId
              AND ds.isActive = 1
            """,
            new { userId, userServiceId, isMaintenance });

        return affected == 0 ? null : await GetGuideAsync(userId, userServiceId);
    }

    public async Task<(IEnumerable<DevPortalServiceDto> Items, int Total)> GetAvailableAsync(int page, int pageSize, string? search)
    {
        using var conn = db.GetConnection();
        var offset = (page - 1) * pageSize;
        var filters = new List<string> { "us.Active = 1", "activeDs.devServiceId IS NULL" };
        if (!string.IsNullOrWhiteSpace(search))
            filters.Add("(c.CompanyName LIKE @pattern OR s.ServiceName LIKE @pattern OR us.subscription_id LIKE @pattern)");
        var where = $"WHERE {string.Join(" AND ", filters)}";
        var args = new { pattern = $"%{search}%", pageSize, offset };

        var total = await conn.ExecuteScalarAsync<int>($"SELECT COUNT(1) FROM ({AvailableSelect} {where}) q", args);
        var items = await conn.QueryAsync<DevPortalServiceDto>($"{AvailableSelect} {where} ORDER BY CreatedAt DESC LIMIT @pageSize OFFSET @offset", args);
        return (items, total);
    }

    public async Task<int> ClaimAsync(int userId, int userServiceId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            INSERT INTO DevServices (userId, userServiceId, commissionPerc, cost, isActive)
            SELECT @userId, us.id, 20.00, COALESCE(us.subscriptionAmount, 0.00), 1
            FROM UserServices us
            WHERE us.id = @userServiceId
              AND us.Active = 1
              AND NOT EXISTS (
                SELECT 1 FROM DevServices ds
                WHERE ds.userServiceId = us.id AND ds.isActive = 1
              );
            """,
            new { userId, userServiceId });

        return await conn.ExecuteScalarAsync<int>(
            """
            SELECT COALESCE((
              SELECT ds.devServiceId
              FROM DevServices ds
              WHERE ds.userServiceId = @userServiceId
                AND ds.userId = @userId
                AND ds.isActive = 1
              ORDER BY ds.devServiceId DESC
              LIMIT 1
            ), 0)
            """,
            new { userId, userServiceId });
    }
}
