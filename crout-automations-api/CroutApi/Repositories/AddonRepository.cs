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
            : "WHERE AddonName LIKE @search OR AddonDescription LIKE @search";
        var param = new { search = $"%{search}%", offset = (page - 1) * pageSize, pageSize };

        var total = await conn.ExecuteScalarAsync<int>($"SELECT COUNT(*) FROM Addons {where}", param);
        var items = await conn.QueryAsync<Addon>(
            $"SELECT addon_id AS AddonId, service_id AS ServiceId, AddonName, AddonDescription, Price FROM Addons {where} ORDER BY AddonName LIMIT @pageSize OFFSET @offset",
            param);

        return (items, total);
    }

    public async Task<Addon?> GetByIdAsync(int addonId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<Addon>(
            "SELECT addon_id AS AddonId, service_id AS ServiceId, AddonName, AddonDescription, Price FROM Addons WHERE addon_id=@addonId",
            new { addonId });
    }

    public async Task<IEnumerable<Addon>> GetByServiceAsync(int serviceId)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<Addon>(
            "SELECT addon_id AS AddonId, service_id AS ServiceId, AddonName, AddonDescription, Price FROM Addons WHERE service_id=@serviceId",
            new { serviceId });
    }

    public async Task<int> CreateAsync(Addon addon)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            "INSERT INTO Addons (service_id, AddonName, AddonDescription, Price) VALUES (@ServiceId, @AddonName, @AddonDescription, @Price); SELECT LAST_INSERT_ID();",
            addon);
    }

    public async Task UpdateAsync(Addon addon)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE Addons SET service_id=@ServiceId, AddonName=@AddonName, AddonDescription=@AddonDescription, Price=@Price WHERE addon_id=@AddonId",
            addon);
    }

    public async Task DeleteAsync(int addonId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("DELETE FROM Addons WHERE addon_id=@addonId", new { addonId });
    }
}
