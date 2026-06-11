using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class ServiceRepository(DbHelper db) : IServiceRepository
{
    public async Task<IEnumerable<Service>> GetAllAsync()
    {
        using var conn = db.GetConnection();
        var services = (await conn.QueryAsync<Service>(
            "SELECT service_id AS ServiceId, ServiceName, Price, HasAddons, Conditional, ServiceDescription FROM Services")).ToList();

        var features = await conn.QueryAsync<(int ServiceId, string Feature)>(
            "SELECT service_id, Feature FROM ServiceFeatures ORDER BY SortOrder");

        foreach (var f in features)
        {
            var svc = services.FirstOrDefault(s => s.ServiceId == f.ServiceId);
            svc?.Features.Add(f.Feature);
        }
        return services;
    }

    public async Task<Service?> GetByIdAsync(int serviceId)
    {
        using var conn = db.GetConnection();
        var svc = await conn.QuerySingleOrDefaultAsync<Service>(
            "SELECT service_id AS ServiceId, ServiceName, Price, HasAddons, Conditional, ServiceDescription FROM Services WHERE service_id=@serviceId",
            new { serviceId });
        if (svc is null) return null;

        var features = await conn.QueryAsync<string>(
            "SELECT Feature FROM ServiceFeatures WHERE service_id=@serviceId ORDER BY SortOrder",
            new { serviceId });
        svc.Features.AddRange(features);
        return svc;
    }

    public async Task<IEnumerable<Addon>> GetAddonsByServiceAsync(int serviceId)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<Addon>(
            "SELECT addon_id AS AddonId, service_id AS ServiceId, AddonName, AddonDescription, Price FROM Addons WHERE service_id=@serviceId",
            new { serviceId });
    }

    public async Task<IEnumerable<Package>> GetPackagesByServiceAsync(int serviceId)
    {
        using var conn = db.GetConnection();
        var packages = (await conn.QueryAsync<Package>(
            @"SELECT p.package_id AS PackageId, p.parent_package_id AS ParentPackageId, p.PackageName, p.PackageDescription, p.Discount, p.minimumRequiredAddons AS MinimumRequiredAddons
              FROM Packages p
              INNER JOIN PackageServices ps ON ps.package_id = p.package_id
              WHERE ps.service_id = @serviceId",
            new { serviceId })).ToList();

        await EnrichPackageServiceIds(conn, packages);
        return packages;
    }

    public async Task<IEnumerable<Package>> GetAllPackagesAsync()
    {
        using var conn = db.GetConnection();
        var packages = (await conn.QueryAsync<Package>(
            "SELECT package_id AS PackageId, parent_package_id AS ParentPackageId, PackageName, PackageDescription, Discount, minimumRequiredAddons AS MinimumRequiredAddons FROM Packages")).ToList();
        await EnrichPackageServiceIds(conn, packages);
        return packages;
    }

    private static async Task EnrichPackageServiceIds(System.Data.IDbConnection conn, List<Package> packages)
    {
        if (packages.Count == 0) return;
        var ids = packages.Select(p => p.PackageId).ToList();
        var rows = await conn.QueryAsync<(int PackageId, int ServiceId)>(
            "SELECT package_id, service_id FROM PackageServices WHERE package_id IN @ids",
            new { ids });
        foreach (var r in rows)
            packages.FirstOrDefault(p => p.PackageId == r.PackageId)?.ServiceIds.Add(r.ServiceId);
    }
}
