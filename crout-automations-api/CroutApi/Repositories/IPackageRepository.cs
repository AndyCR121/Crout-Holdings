using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IPackageRepository
{
    Task<(IEnumerable<Package> Items, int Total)> GetAllAsync(int page, int pageSize);
    Task<Package?> GetByIdAsync(int packageId);
    Task<int> CreateAsync(Package package);
    Task UpdateAsync(Package package);
    Task DeleteAsync(int packageId);
    Task SetServiceLinksAsync(int packageId, List<int> serviceIds);
    Task<IEnumerable<int>> GetLinkedServiceIdsAsync(int packageId);
}
