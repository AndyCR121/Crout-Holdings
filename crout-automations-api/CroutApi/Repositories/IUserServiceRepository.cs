using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IUserServiceRepository
{
    Task<IEnumerable<UserService>> GetByCompanyAsync(int companyId);
    Task<decimal> GetSubscriptionAmountAsync(int userServiceId);
    Task<UserService?> GetByIdAsync(int userServiceId);
    Task<int> CreateAsync(UserService userService);
}
