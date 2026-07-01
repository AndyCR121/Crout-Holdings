using CroutApi.DTOs;

namespace CroutApi.Services;

public interface IWorkflowCapabilityService
{
    Task<IEnumerable<WorkflowIntegrationDefinitionDto>> GetIntegrationDefinitionsAsync(bool activeOnly);
    Task<WorkflowIntegrationDefinitionDto> CreateIntegrationDefinitionAsync(UpsertWorkflowIntegrationDefinitionDto dto);
    Task<WorkflowIntegrationDefinitionDto> UpdateIntegrationDefinitionAsync(int integrationId, UpsertWorkflowIntegrationDefinitionDto dto);
    Task DeleteIntegrationDefinitionAsync(int integrationId);

    Task<IEnumerable<ServiceWorkflowCapabilityDto>> GetServiceCapabilitiesAsync(int serviceId, bool activeOnly);
    Task<ServiceWorkflowCapabilityDto> CreateServiceCapabilityAsync(UpsertServiceWorkflowCapabilityDto dto);
    Task<ServiceWorkflowCapabilityDto> UpdateServiceCapabilityAsync(int capabilityId, UpsertServiceWorkflowCapabilityDto dto);
    Task DeleteServiceCapabilityAsync(int capabilityId);

    Task<IEnumerable<UserServiceWorkflowStepDto>> GetWorkflowStepsAsync(int callerUserId, bool isAdmin, bool isDeveloper, int userServiceId);
    Task<IEnumerable<UserServiceWorkflowStepDto>> SaveRequestedSelectionAsync(int callerUserId, bool isAdmin, int userServiceId, WorkflowStepSelectionDto dto);
    Task<IEnumerable<UserServiceWorkflowStepDto>> ConfirmSelectionAsync(int callerUserId, bool isAdmin, bool isDeveloper, int userServiceId, WorkflowStepSelectionDto dto);
    Task<UserServiceWorkflowStepDto> UpdateWorkflowStepCredentialsAsync(int callerUserId, bool isAdmin, bool isDeveloper, int userServiceId, int workflowStepId, WorkflowCredentialUpdateDto dto);

    Task<UserServiceCustomFormRecordDto?> GetCustomFormAsync(int callerUserId, bool isAdmin, bool isDeveloper, int userServiceId);
    Task<UserServiceCustomFormRecordDto> UpsertCustomFormAsync(int callerUserId, bool isAdmin, bool isDeveloper, int userServiceId, UpsertDevUserServiceFormDto dto);
    Task DeleteCustomFormAsync(int callerUserId, bool isAdmin, bool isDeveloper, int userServiceId);
}
