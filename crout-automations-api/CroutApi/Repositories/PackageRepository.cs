using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class PackageRepository(DbHelper db) : IPackageRepository
{
    public async Task<(IEnumerable<Package> Items, int Total)> GetAllAsync(int page, int pageSize)
    {
        using var conn = db.GetConnection();
        var param = new { offset = (page - 1) * pageSize, pageSize };

        var total = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Packages", param);
        var packages = (await conn.QueryAsync<Package>(
            "SELECT package_id AS PackageId, parent_package_id AS ParentPackageId, PackageName, " +
            "PackageDescription, Discount, minimumRequiredAddons AS MinimumRequiredAddons, Active " +
            "FROM Packages ORDER BY PackageName LIMIT @pageSize OFFSET @offset", param)).ToList();

        if (packages.Count > 0)
        {
            var ids  = packages.Select(p => p.PackageId).ToList();
            var links = await conn.QueryAsync<(int PackageId, int ServiceId)>(
                "SELECT package_id AS PackageId, service_id AS ServiceId FROM PackageServices WHERE package_id IN @ids",
                new { ids });
            foreach (var l in links)
                packages.FirstOrDefault(p => p.PackageId == l.PackageId)?.ServiceIds.Add(l.ServiceId);
        }

        return (packages, total);
    }

    public async Task<Package?> GetByIdAsync(int packageId)
    {
        using var conn = db.GetConnection();
        var pkg = await conn.QuerySingleOrDefaultAsync<Package>(
            "SELECT package_id AS PackageId, parent_package_id AS ParentPackageId, PackageName, " +
            "PackageDescription, Discount, minimumRequiredAddons AS MinimumRequiredAddons, Active " +
            "FROM Packages WHERE package_id=@packageId", new { packageId });
        if (pkg is null) return null;
        var svcIds = await conn.QueryAsync<int>(
            "SELECT service_id FROM PackageServices WHERE package_id=@packageId", new { packageId });
        pkg.ServiceIds.AddRange(svcIds);
        return pkg;
    }

    public async Task<int> CreateAsync(Package package)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            "INSERT INTO Packages (parent_package_id, PackageName, PackageDescription, Discount, minimumRequiredAddons, Active) " +
            "VALUES (@ParentPackageId, @PackageName, @PackageDescription, @Discount, @MinimumRequiredAddons, @Active); " +
            "SELECT LAST_INSERT_ID();", package);
    }

    public async Task UpdateAsync(Package package)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE Packages SET parent_package_id=@ParentPackageId, PackageName=@PackageName, " +
            "PackageDescription=@PackageDescription, Discount=@Discount, minimumRequiredAddons=@MinimumRequiredAddons " +
            "WHERE package_id=@PackageId", package);
    }

    public async Task DeleteAsync(int packageId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("DELETE FROM Packages WHERE package_id=@packageId", new { packageId });
    }

    public async Task SetActiveAsync(int packageId, bool active)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("UPDATE Packages SET Active = @active WHERE package_id = @packageId", new { packageId, active });
    }

    public async Task SetServiceLinksAsync(int packageId, List<int> serviceIds)
    {
        using var conn = db.GetConnection();
        conn.Open();
        using var tx = conn.BeginTransaction();
        await conn.ExecuteAsync(
            "DELETE FROM PackageServices WHERE package_id=@packageId", new { packageId }, tx);
        foreach (var sid in serviceIds)
            await conn.ExecuteAsync(
                "INSERT INTO PackageServices (package_id, service_id) VALUES (@packageId, @sid)",
                new { packageId, sid }, tx);
        tx.Commit();
    }

    public async Task<IEnumerable<int>> GetLinkedServiceIdsAsync(int packageId)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<int>(
            "SELECT service_id FROM PackageServices WHERE package_id=@packageId", new { packageId });
    }
}
