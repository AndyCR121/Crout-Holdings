using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IServiceRepository
{
    Task<IEnumerable<Service>> GetAllAsync();
    Task<Service?> GetByIdAsync(int serviceId);
    Task<int> CreateAsync(Service service);
    Task UpdateAsync(Service service);
    Task DeleteAsync(int serviceId);
    Task<IEnumerable<Addon>> GetAddonsByServiceAsync(int serviceId);
    Task<IEnumerable<Addon>> GetAddonsByIdsAsync(IEnumerable<int> addonIds);
    Task<IEnumerable<Addon>> GetAddonsByNamesAsync(IEnumerable<string> addonNames, int? serviceId = null);
    Task<IEnumerable<Package>> GetPackagesByServiceAsync(int serviceId);
    Task<IEnumerable<Package>> GetAllPackagesAsync();
    Task<Package?> GetPackageByIdAsync(int packageId);
    Task<IEnumerable<PricingComponent>> GetRequiredPricingComponentsAsync();
}
