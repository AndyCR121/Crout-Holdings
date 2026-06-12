using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IAddonRepository
{
    Task<(IEnumerable<IAddon> Items, int Total)> GetAllAsync(int page, int pageSize);
    Task<IAddon?> GetByIdAsync(int addonId);
    Task<IEnumerable<IAddon>> GetByServiceAsync(int serviceId);
    Task<int> CreateAsync(IAddon addon);
    Task UpdateAsync(IAddon addon);
    Task DeleteAsync(int addonId);
}
