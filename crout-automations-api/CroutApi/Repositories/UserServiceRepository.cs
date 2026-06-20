using CroutApi.Helpers;
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
              id AS Id,
              company_id AS CompanyId,
              service_id AS ServiceId,
              package_id AS PackageId,
              subscription_id AS SubscriptionId,
              Config,
              Active,
              Status,
              COALESCE(subscriptionAmount, 0.00) AS SubscriptionAmount,
              pricingSnapshot AS PricingSnapshot,
              paymentDate AS PaymentDate,
              dueDate AS DueDate,
              CreatedAt AS CreatedAt
            FROM UserServices
            WHERE company_id=@companyId AND Active=1
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
              Config,
              Active,
              Status,
              COALESCE(subscriptionAmount, 0.00) AS SubscriptionAmount,
              pricingSnapshot AS PricingSnapshot,
              paymentDate AS PaymentDate,
              dueDate AS DueDate,
              CreatedAt AS CreatedAt
            FROM UserServices
            WHERE id = @userServiceId
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
}
