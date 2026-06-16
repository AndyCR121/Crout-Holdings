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
            "SELECT id AS Id, company_id AS CompanyId, service_id AS ServiceId, package_id AS PackageId, subscription_id AS SubscriptionId, Config, Active, Status FROM UserServices WHERE company_id=@companyId AND Active=1",
            new { companyId });
    }
}
