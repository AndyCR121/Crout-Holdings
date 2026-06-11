using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class ServiceRequestRepository(DbHelper db) : IServiceRequestRepository
{
    public async Task<int> CreateAsync(ServiceRequest request)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            "INSERT INTO ServiceRequests (company_id, service_id, package_id, RequestNote) VALUES (@CompanyId, @ServiceId, @PackageId, @RequestNote); SELECT LAST_INSERT_ID();",
            request);
    }
}
