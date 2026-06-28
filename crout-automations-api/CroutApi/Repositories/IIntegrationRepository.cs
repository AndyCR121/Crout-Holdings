using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IIntegrationRepository
{
    Task<Integration?> GetByUserServiceIdAsync(int userServiceId);
    Task<int> CreatePlaceholderAsync(Integration integration);
    Task<bool> TryCreatePlaceholderAsync(Integration integration);
    Task UpdateProvisioningAsync(int integrationId, string workflowId, string workflowDefinitionJson, string? nodeMappingsJson);
    Task UpdateWorkflowStateAsync(int integrationId, string status, string? lastError, int? publishedBy, DateTime? publishedDate, int? pausedBy, DateTime? pausedDate, string? workflowDefinitionJson, string? nodeMappingsJson);
}
