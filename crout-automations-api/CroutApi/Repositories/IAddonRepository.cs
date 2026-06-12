using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IAddonRepository
{
    Task<(IEnumerable<Addon> Items, int Total)> GetAllAsync(int page, int pageSize, string? search);
    Task<Addon?> GetByIdAsync(int addonId);
    Task<IEnumerable<Addon>> GetByServiceAsync(int serviceId);
    Task<int> CreateAsync(Addon addon);
    Task UpdateAsync(Addon addon);
    Task DeleteAsync(int addonId);
}
