using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IUserServiceRepository
{
    Task<IEnumerable<UserService>> GetByCompanyAsync(int companyId);
}
