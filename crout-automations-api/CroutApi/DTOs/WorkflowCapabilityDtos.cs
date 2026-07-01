using System.Text.Json;

namespace CroutApi.DTOs;

public class WorkflowIntegrationDefinitionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string IntegrationType { get; set; } = string.Empty;
    public bool HasCredentials { get; set; }
    public JsonElement? CredentialFormSchema { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpsertWorkflowIntegrationDefinitionDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? IntegrationType { get; set; }
    public bool HasCredentials { get; set; }
    public JsonElement? CredentialFormSchema { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ServiceWorkflowCapabilityDto
{
    public int Id { get; set; }
    public int ServiceId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string CapabilityType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public int? IntegrationId { get; set; }
    public string? IntegrationName { get; set; }
    public bool RequiresCredentials { get; set; }
    public JsonElement? ConfigurationSchema { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpsertServiceWorkflowCapabilityDto
{
    public int ServiceId { get; set; }
    public string? Role { get; set; }
    public string? CapabilityType { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public int? IntegrationId { get; set; }
    public bool RequiresCredentials { get; set; }
    public JsonElement? ConfigurationSchema { get; set; }
}

public class UserServiceWorkflowStepDto
{
    public int Id { get; set; }
    public int UserServiceId { get; set; }
    public int ServiceId { get; set; }
    public int ServiceWorkflowCapabilityId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string CapabilityType { get; set; } = string.Empty;
    public string CapabilityName { get; set; } = string.Empty;
    public string? CapabilityDescription { get; set; }
    public int? IntegrationId { get; set; }
    public string? IntegrationName { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool RequiresCredentials { get; set; }
    public bool CapabilityIsActive { get; set; }
    public bool IntegrationIsActive { get; set; }
    public JsonElement? Configuration { get; set; }
    public JsonElement? ConfigurationSchema { get; set; }
    public JsonElement? CredentialSchema { get; set; }
    public Dictionary<string, CredentialFieldStateDto>? CredentialFieldStates { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public int? ConfirmedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CredentialFieldStateDto
{
    public bool HasStoredValue { get; set; }
    public string? DisplayValue { get; set; }
}

public class WorkflowStepSelectionDto
{
    public int[]? CapabilityIds { get; set; }
}

public class WorkflowCredentialUpdateDto
{
    public Dictionary<string, string>? Values { get; set; }
}

public class UserServiceCustomFormRecordDto
{
    public int Id { get; set; }
    public int UserServiceId { get; set; }
    public int WorkflowStepId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ResponseMode { get; set; } = "inline";
    public JsonElement PayloadTemplate { get; set; }
    public JsonElement Schema { get; set; }
    public int SchemaVersion { get; set; } = 2;
    public string? ProductionWebhookUrl { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAt { get; set; }
}
