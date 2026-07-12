using CroutApi.DTOs;
using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IIntegrationRepository
{
    Task<Integration?> GetByUserServiceIdAsync(int userServiceId);
    Task<Integration?> GetByIntegrationIdAsync(int integrationId);
    Task<CustomFormAccessContextDto?> GetCustomFormContextByIntegrationIdAsync(int integrationId);
    Task<CustomFormAccessContextDto?> GetCustomFormContextByUserServiceIdAsync(int userServiceId);
    Task<int> CreatePlaceholderAsync(Integration integration);
    Task<bool> TryCreatePlaceholderAsync(Integration integration);
    Task UpdateProvisioningAsync(int integrationId, string workflowId, string workflowDefinitionJson, string? nodeMappingsJson, string templateWorkflowId, string templateServiceTag, string templateVersion, string templateSnapshotHash, DateTime templateResolvedAt);
    Task UpdateWorkflowStateAsync(int integrationId, string status, string? lastError, int? publishedBy, DateTime? publishedDate, int? pausedBy, DateTime? pausedDate, string? workflowDefinitionJson, string? nodeMappingsJson);
    Task SaveCustomFormDraftAsync(int integrationId, string title, string webhookUrl, string schemaJson);
    Task PublishCustomFormAsync(int integrationId, string title, string webhookUrl, string schemaJson, int version, int publishedByUserId, DateTime publishedAtUtc);
    Task UnpublishCustomFormAsync(int integrationId);
    Task DeleteCustomFormAsync(int integrationId);
}
