using CroutApi.Models;
using CroutApi.Repositories;

namespace CroutApi.Services;

public class ServiceCatalogService(
    IServiceRepository services,
    IUserServiceRepository userServices) : IServiceCatalogService
{
    public Task<IEnumerable<Service>>  GetServicesAsync()                      => services.GetAllAsync();
    public Task<IEnumerable<Addon>>    GetAddonsByServiceAsync(int id)         => services.GetAddonsByServiceAsync(id);
    public Task<IEnumerable<Package>>  GetPackagesByServiceAsync(int id)       => services.GetPackagesByServiceAsync(id);
    public Task<IEnumerable<Package>>  GetAllPackagesAsync()                   => services.GetAllPackagesAsync();
    public Task<IEnumerable<UserService>> GetUserServicesAsync(int companyId)  => userServices.GetByCompanyAsync(companyId);
}
