using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IServiceRepository
{
    Task<IEnumerable<Service>> GetAllAsync();
    Task<Service?> GetByIdAsync(int serviceId);
    Task<IEnumerable<Addon>> GetAddonsByServiceAsync(int serviceId);
    Task<IEnumerable<Addon>> GetAddonsByIdsAsync(IEnumerable<int> addonIds);
    Task<IEnumerable<Package>> GetPackagesByServiceAsync(int serviceId);
    Task<IEnumerable<Package>> GetAllPackagesAsync();
    Task<Package?> GetPackageByIdAsync(int packageId);
    Task<IEnumerable<PricingComponent>> GetRequiredPricingComponentsAsync();
}
