using CroutApi.Models;

namespace CroutApi.Repositories;

public interface ICompanyRepository
{
    Task<IEnumerable<Company>> GetByUserAsync(int userId);
    Task<Company?> GetByIdAsync(int companyId);
    Task<int> CreateAsync(Company company);
    Task UpdateAsync(Company company);
    Task DeleteAsync(int companyId, int userId);

    // Admin
    Task<(IEnumerable<Company> Items, int Total)> GetAllAsync(int page, int pageSize, string? search);
    Task AdminUpdateAsync(Company company);
    Task AdminDeleteAsync(int companyId);
}
