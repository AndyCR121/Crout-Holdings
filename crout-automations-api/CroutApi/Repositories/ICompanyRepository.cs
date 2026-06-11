using CroutApi.Models;

namespace CroutApi.Repositories;

public interface ICompanyRepository
{
    Task<IEnumerable<Company>> GetByUserAsync(int userId);
    Task<Company?> GetByIdAsync(int companyId);
    Task<int> CreateAsync(Company company);
    Task UpdateAsync(Company company);
    Task DeleteAsync(int companyId, int userId);
}
