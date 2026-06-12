using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class ServiceFeatureRepository(DbHelper db) : IServiceFeatureRepository
{
    public async Task<(IEnumerable<ServiceFeature> Items, int Total)> GetAllAsync(int page, int pageSize, int? serviceId)
    {
        using var conn = db.GetConnection();
        var where = serviceId.HasValue ? "WHERE service_id=@serviceId" : string.Empty;
        var param  = new { serviceId, offset = (page - 1) * pageSize, pageSize };

        var total = await conn.ExecuteScalarAsync<int>(
            $"SELECT COUNT(*) FROM ServiceFeatures {where}", param);
        var items = await conn.QueryAsync<ServiceFeature>(
            $"SELECT feature_id AS FeatureId, service_id AS ServiceId, Feature, SortOrder " +
            $"FROM ServiceFeatures {where} ORDER BY SortOrder, feature_id LIMIT @pageSize OFFSET @offset", param);

        return (items, total);
    }

    public async Task<ServiceFeature?> GetByIdAsync(int featureId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<ServiceFeature>(
            "SELECT feature_id AS FeatureId, service_id AS ServiceId, Feature, SortOrder " +
            "FROM ServiceFeatures WHERE feature_id=@featureId", new { featureId });
    }

    public async Task<IEnumerable<ServiceFeature>> GetByServiceAsync(int serviceId)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<ServiceFeature>(
            "SELECT feature_id AS FeatureId, service_id AS ServiceId, Feature, SortOrder " +
            "FROM ServiceFeatures WHERE service_id=@serviceId ORDER BY SortOrder", new { serviceId });
    }

    public async Task<int> CreateAsync(ServiceFeature feature)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            "INSERT INTO ServiceFeatures (service_id, Feature, SortOrder) " +
            "VALUES (@ServiceId, @Feature, @SortOrder); SELECT LAST_INSERT_ID();", feature);
    }

    public async Task UpdateAsync(ServiceFeature feature)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE ServiceFeatures SET service_id=@ServiceId, Feature=@Feature, SortOrder=@SortOrder " +
            "WHERE feature_id=@FeatureId", feature);
    }

    public async Task DeleteAsync(int featureId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("DELETE FROM ServiceFeatures WHERE feature_id=@featureId", new { featureId });
    }
}
