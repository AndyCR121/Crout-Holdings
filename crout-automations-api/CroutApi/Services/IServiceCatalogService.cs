using CroutApi.Models;

namespace CroutApi.Services;

public interface IServiceCatalogService
{
    Task<IEnumerable<Service>> GetServicesAsync();
    Task<IEnumerable<Addon>> GetAddonsByServiceAsync(int serviceId);
    Task<IEnumerable<Package>> GetPackagesByServiceAsync(int serviceId);
    Task<IEnumerable<Package>> GetAllPackagesAsync();
    Task<IEnumerable<UserService>> GetUserServicesAsync(int companyId);
}
