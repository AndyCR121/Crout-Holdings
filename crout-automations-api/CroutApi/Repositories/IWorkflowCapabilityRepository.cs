using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IWorkflowCapabilityRepository
{
    Task<ServiceWorkflowCapability?> GetCapabilityByIdAsync(int capabilityId);
    Task<IEnumerable<ServiceWorkflowCapability>> GetCapabilitiesByServiceAsync(int serviceId, bool activeOnly);
    Task<int> CreateCapabilityAsync(ServiceWorkflowCapability capability);
    Task UpdateCapabilityAsync(ServiceWorkflowCapability capability);
    Task DeleteCapabilityAsync(int capabilityId);

    Task<WorkflowIntegrationDefinition?> GetIntegrationDefinitionByIdAsync(int integrationId);
    Task<IEnumerable<WorkflowIntegrationDefinition>> GetIntegrationDefinitionsAsync(bool activeOnly);
    Task<int> CreateIntegrationDefinitionAsync(WorkflowIntegrationDefinition definition);
    Task UpdateIntegrationDefinitionAsync(WorkflowIntegrationDefinition definition);
    Task DeleteIntegrationDefinitionAsync(int integrationId);

    Task<UserServiceAccessContext?> GetUserServiceAccessContextAsync(int userServiceId);
    Task<IEnumerable<UserServiceWorkflowStep>> GetWorkflowStepsByUserServiceIdAsync(int userServiceId);
    Task<UserServiceWorkflowStep?> GetWorkflowStepByIdAsync(int workflowStepId);
    Task<UserServiceWorkflowStep> UpsertWorkflowStepAsync(UserServiceWorkflowStep step);
    Task DisableWorkflowStepsExceptAsync(int userServiceId, IEnumerable<int> capabilityIds, string status);

    Task<UserServiceCustomForm?> GetCustomFormByUserServiceIdAsync(int userServiceId);
    Task<UserServiceCustomForm> UpsertCustomFormAsync(UserServiceCustomForm form);
    Task DeleteCustomFormAsync(int userServiceId);
}
