using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class ServiceRepository(DbHelper db) : IServiceRepository
{
    public async Task<IEnumerable<Service>> GetAllAsync(bool activeOnly = false)
    {
        using var conn = db.GetConnection();
        var services = (await conn.QueryAsync<Service>(
            """
            SELECT
              service_id AS ServiceId,
              ServiceName,
              BaseCost,
              TokensCost,
              TotalTokens,
              HasAddons,
              Conditional,
              Active,
              ServiceDescription,
              DisplayName,
              DisplayTagline,
              IconKey,
              IconSvg,
              DisplayOrder
            FROM Services
            WHERE (@activeOnly = 0 OR Active = 1)
            ORDER BY
              CASE WHEN DisplayOrder IS NULL THEN 1 ELSE 0 END,
              DisplayOrder,
              COALESCE(DisplayName, ServiceName),
              service_id
            """, new { activeOnly })).ToList();

        var features = await conn.QueryAsync<(int ServiceId, string Feature)>(
            "SELECT service_id, Feature FROM ServiceFeatures ORDER BY SortOrder");

        foreach (var f in features)
        {
            var svc = services.FirstOrDefault(s => s.ServiceId == f.ServiceId);
            svc?.Features.Add(f.Feature);
        }

        var addons = (await GetAddonsAsync(conn, null, null, activeOnly: true)).ToList();
        foreach (var service in services)
        {
            service.Addons = addons
                .Where(addon => addon.ServiceIds.Contains(service.ServiceId))
                .OrderBy(addon => addon.Type)
                .ThenBy(addon => addon.DisplayOrder)
                .ThenBy(addon => addon.AddonName)
                .ToList();
            service.HasAddons = service.Addons.Count > 0;
        }

        return services;
    }

    public async Task<Service?> GetByIdAsync(int serviceId, bool activeOnly = false)
    {
        using var conn = db.GetConnection();
        var svc = await conn.QuerySingleOrDefaultAsync<Service>(
            """
            SELECT
              service_id AS ServiceId,
              ServiceName,
              BaseCost,
              TokensCost,
              TotalTokens,
              HasAddons,
              Conditional,
              Active,
              ServiceDescription,
              DisplayName,
              DisplayTagline,
              IconKey,
              IconSvg,
              DisplayOrder
            FROM Services
            WHERE service_id=@serviceId AND (@activeOnly = 0 OR Active = 1)
            """,
            new { serviceId, activeOnly });
        if (svc is null) return null;

        var features = await conn.QueryAsync<string>(
            "SELECT Feature FROM ServiceFeatures WHERE service_id=@serviceId ORDER BY SortOrder",
            new { serviceId });
        svc.Features.AddRange(features);
        svc.Addons = (await GetAddonsAsync(conn, serviceId, null, activeOnly: true)).ToList();
        svc.HasAddons = svc.Addons.Count > 0;
        return svc;
    }

    public async Task<int> CreateAsync(Service service)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO Services (ServiceName, BaseCost, TokensCost, TotalTokens, HasAddons, Conditional, Active, ServiceDescription, DisplayName, DisplayTagline, IconKey, IconSvg, DisplayOrder)
            VALUES (@ServiceName, @BaseCost, @TokensCost, @TotalTokens, @HasAddons, @Conditional, @Active, @ServiceDescription, @DisplayName, @DisplayTagline, @IconKey, @IconSvg, @DisplayOrder);
            SELECT LAST_INSERT_ID();
            """,
            service);
    }

    public async Task UpdateAsync(Service service)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE Services
            SET ServiceName = @ServiceName,
                BaseCost = @BaseCost,
                TokensCost = @TokensCost,
                TotalTokens = @TotalTokens,
                HasAddons = @HasAddons,
                Conditional = @Conditional,
                ServiceDescription = @ServiceDescription,
                DisplayName = @DisplayName,
                DisplayTagline = @DisplayTagline,
                IconKey = @IconKey,
                IconSvg = @IconSvg,
                DisplayOrder = @DisplayOrder
            WHERE service_id = @ServiceId
            """,
            service);
    }

    public async Task DeleteAsync(int serviceId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("DELETE FROM Services WHERE service_id = @serviceId", new { serviceId });
    }

    public async Task SetActiveAsync(int serviceId, bool active)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("UPDATE Services SET Active = @active WHERE service_id = @serviceId", new { serviceId, active });
    }

    public async Task<IEnumerable<Addon>> GetAddonsByServiceAsync(int serviceId)
    {
        using var conn = db.GetConnection();
        return await GetAddonsAsync(conn, serviceId, null, activeOnly: true);
    }

    public async Task<IEnumerable<Addon>> GetAddonsByIdsAsync(IEnumerable<int> addonIds)
    {
        var ids = addonIds.Distinct().ToArray();
        if (ids.Length == 0) return [];

        using var conn = db.GetConnection();
        return await GetAddonsAsync(conn, null, ids, activeOnly: false);
    }

    public async Task<IEnumerable<Addon>> GetAddonsByNamesAsync(IEnumerable<string> addonNames, int? serviceId = null)
    {
        var names = addonNames
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (names.Length == 0) return [];

        using var conn = db.GetConnection();
        return await GetAddonsAsync(conn, serviceId, null, activeOnly: false, addonNames: names);
    }

    public async Task<IEnumerable<Package>> GetPackagesByServiceAsync(int serviceId)
    {
        using var conn = db.GetConnection();
        var packages = (await conn.QueryAsync<Package>(
            @"SELECT p.package_id AS PackageId, p.parent_package_id AS ParentPackageId, p.PackageName, p.PackageDescription, p.Discount, p.minimumRequiredAddons AS MinimumRequiredAddons, p.Active
              FROM Packages p
              INNER JOIN PackageServices ps ON ps.package_id = p.package_id
              WHERE p.Active = 1 AND (ps.service_id = @serviceId
                 OR p.parent_package_id IN (
                    SELECT parent.package_id
                    FROM Packages parent
                    INNER JOIN PackageServices parent_ps ON parent_ps.package_id = parent.package_id
                    WHERE parent_ps.service_id = @serviceId
                 ))",
            new { serviceId })).ToList();

        await EnrichPackageServiceIds(conn, packages);
        return packages;
    }

    public async Task<IEnumerable<Package>> GetAllPackagesAsync()
    {
        using var conn = db.GetConnection();
        var packages = (await conn.QueryAsync<Package>(
            """
            SELECT package_id AS PackageId, parent_package_id AS ParentPackageId, PackageName, PackageDescription, Discount, minimumRequiredAddons AS MinimumRequiredAddons, Active
            FROM Packages
            WHERE Active = 1 AND EXISTS (SELECT 1 FROM PackageServices ps WHERE ps.package_id = Packages.package_id)
            """
        )).ToList();
        await EnrichPackageServiceIds(conn, packages);
        return packages;
    }

    public async Task<Package?> GetPackageByIdAsync(int packageId)
    {
        using var conn = db.GetConnection();
        var package = await conn.QuerySingleOrDefaultAsync<Package>(
            "SELECT package_id AS PackageId, parent_package_id AS ParentPackageId, PackageName, PackageDescription, Discount, minimumRequiredAddons AS MinimumRequiredAddons, Active FROM Packages WHERE package_id=@packageId AND Active = 1",
            new { packageId });
        if (package is null) return null;
        await EnrichPackageServiceIds(conn, [package]);
        return package;
    }

    public async Task<IEnumerable<PricingComponent>> GetRequiredPricingComponentsAsync()
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<PricingComponent>(
            """
            SELECT
              pricing_component_id AS PricingComponentId,
              component_key AS ComponentKey,
              component_name AS ComponentName,
              category AS Category,
              pricing_type AS PricingType,
              amount AS Amount,
              is_required_default AS IsRequiredDefault,
              is_active AS IsActive
            FROM PricingComponents
            WHERE is_active = 1 AND is_required_default = 1
            ORDER BY pricing_component_id
            """);
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

    private static async Task<IEnumerable<Addon>> GetAddonsAsync(
        System.Data.IDbConnection conn,
        int? serviceId,
        int[]? addonIds,
        bool activeOnly,
        string[]? addonNames = null)
    {
        var filters = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("activeOnly", activeOnly);

        if (serviceId is not null)
        {
            filters.Add("sa.service_id = @serviceId");
            parameters.Add("serviceId", serviceId.Value);
        }

        if (addonIds is { Length: > 0 })
        {
            filters.Add("a.addon_id IN @addonIds");
            parameters.Add("addonIds", addonIds);
        }

        if (addonNames is { Length: > 0 })
        {
            filters.Add("a.AddonName IN @addonNames");
            parameters.Add("addonNames", addonNames);
        }

        if (activeOnly)
            filters.Add("a.IsActive = 1");

        var where = filters.Count == 0 ? string.Empty : $"WHERE {string.Join(" AND ", filters)}";
        var addons = (await conn.QueryAsync<Addon>(
            $"""
            SELECT DISTINCT
              a.addon_id AS AddonId,
              a.AddonName,
              a.AddonDescription,
              a.Type,
              a.MonthlyPrice,
              a.IsActive,
              a.DisplayOrder
            FROM Addons a
            LEFT JOIN ServiceAddons sa ON sa.addon_id = a.addon_id
            {where}
            ORDER BY FIELD(a.Type, 'Trigger', 'Action', 'Output'), a.DisplayOrder, a.AddonName
            """,
            parameters)).ToList();

        if (addons.Count == 0) return addons;

        var addonIdList = addons.Select(addon => addon.AddonId).ToArray();
        var serviceLinks = await conn.QueryAsync<(int AddonId, int ServiceId)>(
            "SELECT addon_id AS AddonId, service_id AS ServiceId FROM ServiceAddons WHERE addon_id IN @addonIds",
            new { addonIds = addonIdList });
        foreach (var link in serviceLinks)
            addons.First(addon => addon.AddonId == link.AddonId).ServiceIds.Add(link.ServiceId);

        var integrationLinks = await conn.QueryAsync<(int AddonId, int Id, string Name, string? Description, string IntegrationType, bool HasCredentials, string? CredentialFormSchemaJson, bool IsActive, DateTime CreatedAt, DateTime UpdatedAt)>(
            """
            SELECT
              ai.addon_id AS AddonId,
              idef.id AS Id,
              idef.name AS Name,
              idef.description AS Description,
              idef.integration_type AS IntegrationType,
              idef.has_credentials AS HasCredentials,
              idef.credential_form_schema_json AS CredentialFormSchemaJson,
              idef.is_active AS IsActive,
              idef.created_at AS CreatedAt,
              idef.updated_at AS UpdatedAt
            FROM AddonIntegrations ai
            JOIN IntegrationDefinitions idef ON idef.id = ai.integration_definition_id
            WHERE ai.addon_id IN @addonIds
            ORDER BY idef.name, idef.id
            """,
            new { addonIds = addonIdList });

        foreach (var link in integrationLinks)
        {
            addons.First(addon => addon.AddonId == link.AddonId).Integrations.Add(new IntegrationDefinition
            {
                Id = link.Id,
                Name = link.Name,
                Description = link.Description,
                IntegrationType = link.IntegrationType,
                HasCredentials = link.HasCredentials,
                CredentialFormSchemaJson = link.CredentialFormSchemaJson,
                IsActive = link.IsActive,
                CreatedAt = link.CreatedAt,
                UpdatedAt = link.UpdatedAt
            });
        }

        return addons;
    }
}
