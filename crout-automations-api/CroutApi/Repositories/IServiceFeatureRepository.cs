using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IServiceFeatureRepository
{
    Task<(IEnumerable<ServiceFeature> Items, int Total)> GetAllAsync(int page, int pageSize, int? serviceId);
    Task<ServiceFeature?> GetByIdAsync(int featureId);
    Task<IEnumerable<ServiceFeature>> GetByServiceAsync(int serviceId);
    Task<int> CreateAsync(ServiceFeature feature);
    Task UpdateAsync(ServiceFeature feature);
    Task DeleteAsync(int featureId);
}
