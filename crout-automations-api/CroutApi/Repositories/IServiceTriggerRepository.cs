using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IServiceTriggerRepository
{
    Task<IEnumerable<ServiceTriggerConfig>> GetConfigsAsync(int userId, int companyId, int serviceId);
    Task<ServiceTriggerConfig?> GetConfigForExecutionAsync(int userId, int configId, int companyId, int? userServiceId);
    Task<int> CreateExecutionAsync(ServiceTriggerExecution execution);
}
