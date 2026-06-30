using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IServiceTriggerRepository
{
    Task<IEnumerable<ServiceTriggerConfig>> GetConfigsAsync(int userId, int companyId, int serviceId, int? userServiceId = null);
    Task<ServiceTriggerConfig?> GetConfigForExecutionAsync(int userId, int configId, int companyId, int? userServiceId);
    Task<DeveloperAssignedFormContext?> GetDeveloperAssignedFormContextAsync(int developerUserId, int userServiceId);
    Task<ServiceTriggerConfig?> GetFormConfigByUserServiceIdAsync(int userServiceId);
    Task<ServiceTriggerConfig> CreateFormConfigAsync(ServiceTriggerConfig config);
    Task<ServiceTriggerConfig> UpdateFormConfigAsync(ServiceTriggerConfig config);
    Task DeactivateFormConfigAsync(int configId);
    Task<int> CreateExecutionAsync(ServiceTriggerExecution execution);
}
