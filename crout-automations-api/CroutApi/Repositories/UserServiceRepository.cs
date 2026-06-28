using CroutApi.Helpers;
using CroutApi.DTOs;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class UserServiceRepository(DbHelper db) : IUserServiceRepository
{
    public async Task<IEnumerable<UserService>> GetByCompanyAsync(int companyId)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<UserService>(
            """
            SELECT
              us.id AS Id,
              us.company_id AS CompanyId,
              us.service_id AS ServiceId,
              us.package_id AS PackageId,
              us.subscription_id AS SubscriptionId,
              us.Config,
              us.Active,
              us.Status,
              COALESCE(us.subscriptionAmount, 0.00) AS SubscriptionAmount,
              us.pricingSnapshot AS PricingSnapshot,
              us.paymentDate AS PaymentDate,
              us.dueDate AS DueDate,
              us.CreatedAt AS CreatedAt,
              i.status AS IntegrationStatus,
              i.workflow_name AS IntegrationWorkflowName
            FROM UserServices us
            LEFT JOIN Integrations i ON i.user_service_id = us.id
            WHERE us.company_id=@companyId AND us.Active=1
            """,
            new { companyId });
    }

    public async Task<decimal> GetSubscriptionAmountAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<decimal>(
            "SELECT COALESCE(subscriptionAmount, 0.00) FROM UserServices WHERE id = @userServiceId",
            new { userServiceId });
    }

    public async Task<UserService?> GetByIdAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<UserService>(
            """
            SELECT
              id AS Id,
              company_id AS CompanyId,
              service_id AS ServiceId,
              package_id AS PackageId,
              subscription_id AS SubscriptionId,
              us.Config,
              us.Active,
              us.Status,
              COALESCE(subscriptionAmount, 0.00) AS SubscriptionAmount,
              pricingSnapshot AS PricingSnapshot,
              paymentDate AS PaymentDate,
              dueDate AS DueDate,
              us.CreatedAt AS CreatedAt,
              i.status AS IntegrationStatus,
              i.workflow_name AS IntegrationWorkflowName
            FROM UserServices us
            LEFT JOIN Integrations i ON i.user_service_id = us.id
            WHERE us.id = @userServiceId
            """,
            new { userServiceId });
    }

    public async Task<UserServiceIntegrationContextDto?> GetIntegrationContextAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<UserServiceIntegrationContextDto>(
            """
            SELECT
              us.id AS UserServiceId,
              us.company_id AS CompanyId,
              c.CompanyName AS CompanyName,
              us.service_id AS ServiceId,
              s.ServiceName AS ServiceName,
              us.Config AS Config
            FROM UserServices us
            JOIN Companies c ON c.company_id = us.company_id
            JOIN Services s ON s.service_id = us.service_id
            WHERE us.id = @userServiceId
            """,
            new { userServiceId });
    }

    public async Task<int> CreateAsync(UserService userService)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO UserServices
              (company_id, service_id, package_id, Config, subscriptionAmount, pricingSnapshot, paymentDate, dueDate, Active, Status)
            VALUES
              (@CompanyId, @ServiceId, @PackageId, @Config, @SubscriptionAmount, @PricingSnapshot, @PaymentDate, @DueDate, @Active, @Status);
            SELECT LAST_INSERT_ID();
            """,
            userService);
    }

    public async Task UpdateConfigAsync(int userServiceId, string config, int status)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE UserServices SET Config = @config, Status = @status WHERE id = @userServiceId",
            new { userServiceId, config, status });
    }

    public async Task<(IEnumerable<AdminClientServiceRowDto> Items, int Total)> AdminGetAllAsync(
        int page,
        int pageSize,
        string? search,
        int? userId,
        int? companyId,
        int? serviceId,
        bool? active)
    {
        using var conn = db.GetConnection();
        var offset = (page - 1) * pageSize;
        var filters = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("pageSize", pageSize);
        parameters.Add("offset", offset);

        if (!string.IsNullOrWhiteSpace(search))
        {
            filters.Add("(u.FirstName LIKE @pattern OR u.Surname LIKE @pattern OR u.Email LIKE @pattern OR c.CompanyName LIKE @pattern OR s.ServiceName LIKE @pattern OR us.subscription_id LIKE @pattern)");
            parameters.Add("pattern", $"%{search.Trim()}%");
        }
        if (userId is not null)
        {
            filters.Add("u.user_id = @userId");
            parameters.Add("userId", userId);
        }
        if (companyId is not null)
        {
            filters.Add("c.company_id = @companyId");
            parameters.Add("companyId", companyId);
        }
        if (serviceId is not null)
        {
            filters.Add("s.service_id = @serviceId");
            parameters.Add("serviceId", serviceId);
        }
        if (active is not null)
        {
            filters.Add("us.Active = @active");
            parameters.Add("active", active.Value);
        }

        var where = filters.Count > 0 ? $"WHERE {string.Join(" AND ", filters)}" : "";
        var total = await conn.ExecuteScalarAsync<int>(
            $"""
            SELECT COUNT(1)
            FROM UserServices us
            JOIN Companies c ON c.company_id = us.company_id
            JOIN Users u ON u.user_id = c.user_id
            JOIN Services s ON s.service_id = us.service_id
            LEFT JOIN Packages p ON p.package_id = us.package_id
            {where}
            """,
            parameters);

        var items = await conn.QueryAsync<AdminClientServiceRowDto>(
            $"""
            SELECT
              us.id AS UserServiceId,
              c.company_id AS CompanyId,
              c.CompanyName AS CompanyName,
              u.user_id AS UserId,
              CONCAT(COALESCE(u.FirstName, ''), ' ', COALESCE(u.Surname, '')) AS ClientName,
              u.Email AS ClientEmail,
              s.service_id AS ServiceId,
              s.ServiceName AS ServiceName,
              us.package_id AS PackageId,
              p.PackageName AS PackageName,
              us.subscription_id AS SubscriptionId,
              us.Config AS Config,
              us.Active AS Active,
              CAST(us.Status AS SIGNED) AS Status,
              COALESCE(us.subscriptionAmount, 0.00) AS SubscriptionAmount,
              us.pricingSnapshot AS PricingSnapshot,
              us.paymentDate AS PaymentDate,
              us.dueDate AS DueDate,
              us.CreatedAt AS CreatedAt,
              i.status AS IntegrationStatus,
              i.workflow_name AS IntegrationWorkflowName,
              i.last_error AS IntegrationLastError,
              i.published_date AS IntegrationPublishedDate,
              i.paused_date AS IntegrationPausedDate
            FROM UserServices us
            JOIN Companies c ON c.company_id = us.company_id
            JOIN Users u ON u.user_id = c.user_id
            JOIN Services s ON s.service_id = us.service_id
            LEFT JOIN Packages p ON p.package_id = us.package_id
            LEFT JOIN Integrations i ON i.user_service_id = us.id
            {where}
            ORDER BY us.CreatedAt DESC, us.id DESC
            LIMIT @pageSize OFFSET @offset
            """,
            parameters);

        return (items, total);
    }

    public async Task<AdminClientServiceRowDto?> AdminGetRowByIdAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<AdminClientServiceRowDto>(
            """
            SELECT
              us.id AS UserServiceId,
              c.company_id AS CompanyId,
              c.CompanyName AS CompanyName,
              u.user_id AS UserId,
              CONCAT(COALESCE(u.FirstName, ''), ' ', COALESCE(u.Surname, '')) AS ClientName,
              u.Email AS ClientEmail,
              s.service_id AS ServiceId,
              s.ServiceName AS ServiceName,
              us.package_id AS PackageId,
              p.PackageName AS PackageName,
              us.subscription_id AS SubscriptionId,
              us.Config AS Config,
              us.Active AS Active,
              CAST(us.Status AS SIGNED) AS Status,
              COALESCE(us.subscriptionAmount, 0.00) AS SubscriptionAmount,
              us.pricingSnapshot AS PricingSnapshot,
              us.paymentDate AS PaymentDate,
              us.dueDate AS DueDate,
              us.CreatedAt AS CreatedAt,
              i.status AS IntegrationStatus,
              i.workflow_name AS IntegrationWorkflowName,
              i.last_error AS IntegrationLastError,
              i.published_date AS IntegrationPublishedDate,
              i.paused_date AS IntegrationPausedDate
            FROM UserServices us
            JOIN Companies c ON c.company_id = us.company_id
            JOIN Users u ON u.user_id = c.user_id
            JOIN Services s ON s.service_id = us.service_id
            LEFT JOIN Packages p ON p.package_id = us.package_id
            LEFT JOIN Integrations i ON i.user_service_id = us.id
            WHERE us.id = @userServiceId
            """,
            new { userServiceId });
    }

    public async Task<int> AdminCreateAsync(UserService userService)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO UserServices
              (company_id, service_id, package_id, subscription_id, Config, subscriptionAmount, pricingSnapshot, paymentDate, dueDate, Active, Status)
            VALUES
              (@CompanyId, @ServiceId, @PackageId, @SubscriptionId, @Config, @SubscriptionAmount, @PricingSnapshot, @PaymentDate, @DueDate, @Active, @Status);
            SELECT LAST_INSERT_ID();
            """,
            userService);
    }

    public async Task AdminUpdateAsync(int userServiceId, AdminUpdateClientServiceConfigDto dto)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE UserServices
            SET package_id = @PackageId,
                subscription_id = @SubscriptionId,
                Config = @Config,
                subscriptionAmount = @SubscriptionAmount,
                paymentDate = @PaymentDate,
                dueDate = @DueDate,
                Active = @Active,
                Status = @Status
            WHERE id = @UserServiceId
            """,
            new
            {
                UserServiceId = userServiceId,
                dto.PackageId,
                SubscriptionId = string.IsNullOrWhiteSpace(dto.SubscriptionId) ? null : dto.SubscriptionId.Trim(),
                Config = dto.Config ?? "{}",
                SubscriptionAmount = dto.SubscriptionAmount < 0 ? 0 : dto.SubscriptionAmount,
                dto.PaymentDate,
                dto.DueDate,
                dto.Active,
                dto.Status
            });
    }

    public async Task AdminDeactivateAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("UPDATE UserServices SET Active = 0, Status = 0 WHERE id = @userServiceId", new { userServiceId });
    }

    public async Task<(IEnumerable<AdminPaystackMappingRowDto> Items, int Total)> AdminGetPaystackMappingsAsync(
        int page,
        int pageSize,
        string? search,
        string? mappingStatus)
    {
        using var conn = db.GetConnection();
        var offset = (page - 1) * pageSize;
        var filters = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("pageSize", pageSize);
        parameters.Add("offset", offset);

        if (!string.IsNullOrWhiteSpace(search))
        {
            filters.Add("(u.FirstName LIKE @pattern OR u.Surname LIKE @pattern OR u.Email LIKE @pattern OR c.CompanyName LIKE @pattern OR s.ServiceName LIKE @pattern OR us.subscription_id LIKE @pattern)");
            parameters.Add("pattern", $"%{search.Trim()}%");
        }

        var status = string.IsNullOrWhiteSpace(mappingStatus) ? null : mappingStatus.Trim().ToLowerInvariant();
        if (status is not null)
        {
            filters.Add(status switch
            {
                "mapped" => "us.subscription_id IS NOT NULL AND us.subscription_id <> '' AND us.Active = 1",
                "unmapped" => "(us.subscription_id IS NULL OR us.subscription_id = '') AND us.Active = 1",
                "failed" => "us.Active = 0 AND us.subscription_id IS NOT NULL AND us.subscription_id <> ''",
                "needs_review" => "us.Active = 1 AND us.Status = 3",
                _ => "1 = 1"
            });
        }

        var where = filters.Count > 0 ? $"WHERE {string.Join(" AND ", filters)}" : "";
        var baseSql =
            $"""
            FROM UserServices us
            JOIN Companies c ON c.company_id = us.company_id
            JOIN Users u ON u.user_id = c.user_id
            JOIN Services s ON s.service_id = us.service_id
            LEFT JOIN Packages p ON p.package_id = us.package_id
            {where}
            """;

        var total = await conn.ExecuteScalarAsync<int>($"SELECT COUNT(1) {baseSql}", parameters);
        var items = await conn.QueryAsync<AdminPaystackMappingRowDto>(
            $"""
            SELECT
              us.id AS UserServiceId,
              c.company_id AS CompanyId,
              c.CompanyName AS CompanyName,
              u.user_id AS UserId,
              CONCAT(COALESCE(u.FirstName, ''), ' ', COALESCE(u.Surname, '')) AS ClientName,
              u.Email AS ClientEmail,
              s.service_id AS ServiceId,
              s.ServiceName AS ServiceName,
              us.package_id AS PackageId,
              p.PackageName AS PackageName,
              us.subscription_id AS SubscriptionId,
              COALESCE(us.subscriptionAmount, 0.00) AS SubscriptionAmount,
              CAST(us.Status AS SIGNED) AS Status,
              us.Active AS Active,
              CASE
                WHEN us.Active = 0 AND us.subscription_id IS NOT NULL AND us.subscription_id <> '' THEN 'failed'
                WHEN us.Active = 1 AND us.Status = 3 THEN 'needs_review'
                WHEN us.subscription_id IS NULL OR us.subscription_id = '' THEN 'unmapped'
                ELSE 'mapped'
              END AS MappingStatus,
              us.paymentDate AS PaymentDate,
              us.dueDate AS DueDate
            {baseSql}
            ORDER BY us.CreatedAt DESC, us.id DESC
            LIMIT @pageSize OFFSET @offset
            """,
            parameters);

        return (items, total);
    }

    public async Task AdminUpdatePaystackMappingAsync(int userServiceId, AdminMapPaystackSubscriptionDto dto)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE UserServices
            SET subscription_id = @SubscriptionId,
                Status = @Status,
                paymentDate = @PaymentDate,
                dueDate = @DueDate
            WHERE id = @UserServiceId
            """,
            new
            {
                UserServiceId = userServiceId,
                SubscriptionId = string.IsNullOrWhiteSpace(dto.SubscriptionId) ? null : dto.SubscriptionId.Trim(),
                dto.Status,
                dto.PaymentDate,
                dto.DueDate
            });
    }
}
