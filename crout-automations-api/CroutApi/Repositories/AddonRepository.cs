using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class AddonRepository(DbHelper db) : IAddonRepository
{
    public async Task<(IEnumerable<Addon> Items, int Total)> GetAllAsync(int page, int pageSize, string? search)
    {
        using var conn = db.GetConnection();
        var where = string.IsNullOrWhiteSpace(search)
            ? string.Empty
            : "WHERE a.AddonName LIKE @search OR a.AddonDescription LIKE @search";
        var param = new { search = $"%{search}%", offset = (page - 1) * pageSize, pageSize };

        var total = await conn.ExecuteScalarAsync<int>($"SELECT COUNT(*) FROM Addons a {where}", param);
        var items = (await conn.QueryAsync<Addon>(
            $"""
            SELECT
              a.addon_id AS AddonId,
              a.AddonName,
              a.AddonDescription,
              a.Type,
              a.MonthlyPrice,
              a.IsActive,
              a.DisplayOrder
            FROM Addons a
            {where}
            ORDER BY FIELD(a.Type, 'Trigger', 'Action', 'Output'), a.DisplayOrder, a.AddonName
            LIMIT @pageSize OFFSET @offset
            """,
            param)).ToList();

        await EnrichAsync(conn, items);

        return (items, total);
    }

    public async Task<Addon?> GetByIdAsync(int addonId)
    {
        using var conn = db.GetConnection();
        var addon = await conn.QuerySingleOrDefaultAsync<Addon>(
            """
            SELECT
              addon_id AS AddonId,
              AddonName,
              AddonDescription,
              Type,
              MonthlyPrice,
              IsActive,
              DisplayOrder
            FROM Addons
            WHERE addon_id=@addonId
            """,
            new { addonId });
        if (addon is null) return null;
        await EnrichAsync(conn, [addon]);
        return addon;
    }

    public async Task<IEnumerable<Addon>> GetByServiceAsync(int serviceId)
    {
        using var conn = db.GetConnection();
        var items = (await conn.QueryAsync<Addon>(
            """
            SELECT
              a.addon_id AS AddonId,
              a.AddonName,
              a.AddonDescription,
              a.Type,
              a.MonthlyPrice,
              a.IsActive,
              a.DisplayOrder
            FROM Addons a
            JOIN ServiceAddons sa ON sa.addon_id = a.addon_id
            WHERE sa.service_id=@serviceId
            ORDER BY FIELD(a.Type, 'Trigger', 'Action', 'Output'), a.DisplayOrder, a.AddonName
            """,
            new { serviceId })).ToList();
        await EnrichAsync(conn, items);
        return items;
    }

    public async Task<int> CreateAsync(Addon addon)
    {
        using var conn = db.GetConnection();
        conn.Open();
        using var tx = conn.BeginTransaction();
        var addonId = await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO Addons (service_id, AddonName, AddonDescription, Type, MonthlyPrice, Price, IsActive, DisplayOrder)
            VALUES (@LegacyServiceId, @AddonName, @AddonDescription, @Type, @MonthlyPrice, @MonthlyPrice, @IsActive, @DisplayOrder);
            SELECT LAST_INSERT_ID();
            """,
            new
            {
                LegacyServiceId = addon.ServiceId,
                addon.AddonName,
                addon.AddonDescription,
                Type = string.IsNullOrWhiteSpace(addon.Type) ? WorkflowRoles.Action : addon.Type,
                addon.MonthlyPrice,
                addon.IsActive,
                addon.DisplayOrder
            },
            tx);
        await ReplaceServiceLinksAsync(conn, tx, addonId, ResolveServiceIds(addon));
        await ReplaceIntegrationLinksAsync(conn, tx, addonId, addon.Integrations.Select(integration => integration.Id));
        tx.Commit();
        return addonId;
    }

    public async Task UpdateAsync(Addon addon)
    {
        using var conn = db.GetConnection();
        conn.Open();
        using var tx = conn.BeginTransaction();
        await conn.ExecuteAsync(
            """
            UPDATE Addons
            SET service_id=@LegacyServiceId,
                AddonName=@AddonName,
                AddonDescription=@AddonDescription,
                Type=@Type,
                MonthlyPrice=@MonthlyPrice,
                Price=@MonthlyPrice,
                IsActive=@IsActive,
                DisplayOrder=@DisplayOrder
            WHERE addon_id=@AddonId
            """,
            new
            {
                addon.AddonId,
                LegacyServiceId = addon.ServiceId,
                addon.AddonName,
                addon.AddonDescription,
                Type = string.IsNullOrWhiteSpace(addon.Type) ? WorkflowRoles.Action : addon.Type,
                addon.MonthlyPrice,
                addon.IsActive,
                addon.DisplayOrder
            },
            tx);
        await ReplaceServiceLinksAsync(conn, tx, addon.AddonId, ResolveServiceIds(addon));
        await ReplaceIntegrationLinksAsync(conn, tx, addon.AddonId, addon.Integrations.Select(integration => integration.Id));
        tx.Commit();
    }

    public async Task DeleteAsync(int addonId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("DELETE FROM Addons WHERE addon_id=@addonId", new { addonId });
    }

    public async Task SetServiceLinksAsync(int addonId, List<int> serviceIds)
    {
        using var conn = db.GetConnection();
        conn.Open();
        using var tx = conn.BeginTransaction();
        await ReplaceServiceLinksAsync(conn, tx, addonId, serviceIds);
        tx.Commit();
    }

    public async Task SetIntegrationLinksAsync(int addonId, List<int> integrationIds)
    {
        using var conn = db.GetConnection();
        conn.Open();
        using var tx = conn.BeginTransaction();
        await ReplaceIntegrationLinksAsync(conn, tx, addonId, integrationIds);
        tx.Commit();
    }

    private static async Task EnrichAsync(System.Data.IDbConnection conn, List<Addon> addons)
    {
        if (addons.Count == 0) return;

        var ids = addons.Select(addon => addon.AddonId).ToArray();
        var serviceLinks = await conn.QueryAsync<(int AddonId, int ServiceId)>(
            "SELECT addon_id AS AddonId, service_id AS ServiceId FROM ServiceAddons WHERE addon_id IN @ids",
            new { ids });
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
            WHERE ai.addon_id IN @ids
            ORDER BY idef.name, idef.id
            """,
            new { ids });
        foreach (var link in integrationLinks)
        {
            addons.First(addon => addon.AddonId == link.AddonId).Integrations.Add(new WorkflowIntegrationDefinition
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
    }

    private static async Task ReplaceServiceLinksAsync(System.Data.IDbConnection conn, System.Data.IDbTransaction tx, int addonId, IEnumerable<int> serviceIds)
    {
        var ids = serviceIds.Distinct().ToArray();
        await conn.ExecuteAsync("DELETE FROM ServiceAddons WHERE addon_id=@addonId", new { addonId }, tx);
        foreach (var serviceId in ids)
        {
            await conn.ExecuteAsync(
                "INSERT INTO ServiceAddons (service_id, addon_id) VALUES (@serviceId, @addonId)",
                new { serviceId, addonId },
                tx);
        }

        await conn.ExecuteAsync(
            "UPDATE Addons SET service_id=@serviceId WHERE addon_id=@addonId",
            new { addonId, serviceId = ids.FirstOrDefault() == 0 ? (int?)null : ids.First() },
            tx);
    }

    private static async Task ReplaceIntegrationLinksAsync(System.Data.IDbConnection conn, System.Data.IDbTransaction tx, int addonId, IEnumerable<int> integrationIds)
    {
        var ids = integrationIds.Distinct().Where(id => id > 0).ToArray();
        await conn.ExecuteAsync("DELETE FROM AddonIntegrations WHERE addon_id=@addonId", new { addonId }, tx);
        foreach (var integrationId in ids)
        {
            await conn.ExecuteAsync(
                "INSERT INTO AddonIntegrations (addon_id, integration_definition_id) VALUES (@addonId, @integrationId)",
                new { addonId, integrationId },
                tx);
        }
    }

    private static IEnumerable<int> ResolveServiceIds(Addon addon)
    {
        if (addon.ServiceIds.Count > 0) return addon.ServiceIds;
        return addon.ServiceId is > 0 ? [addon.ServiceId.Value] : [];
    }
}
