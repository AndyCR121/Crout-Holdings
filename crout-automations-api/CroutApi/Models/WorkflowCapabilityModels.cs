namespace CroutApi.Models;

public class ServiceWorkflowCapability
{
    public int Id { get; set; }
    public int ServiceId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string CapabilityType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public int? IntegrationId { get; set; }
    public bool RequiresCredentials { get; set; }
    public string? ConfigurationSchemaJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? IntegrationName { get; set; }
}

public class WorkflowIntegrationDefinition
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string IntegrationType { get; set; } = string.Empty;
    public bool HasCredentials { get; set; }
    public string? CredentialFormSchemaJson { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UserServiceWorkflowStep
{
    public int Id { get; set; }
    public int UserServiceId { get; set; }
    public int ServiceId { get; set; }
    public int ServiceWorkflowCapabilityId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string CapabilityType { get; set; } = string.Empty;
    public int? IntegrationId { get; set; }
    public string Status { get; set; } = WorkflowStepStatuses.Pending;
    public string? ConfigurationJson { get; set; }
    public string? CredentialValuesJson { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public int? ConfirmedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CapabilityName { get; set; } = string.Empty;
    public string? CapabilityDescription { get; set; }
    public bool CapabilityIsActive { get; set; }
    public bool RequiresCredentials { get; set; }
    public string? ConfigurationSchemaJson { get; set; }
    public string? CredentialSchemaJson { get; set; }
    public string? IntegrationName { get; set; }
    public bool IntegrationIsActive { get; set; }
}

public class UserServiceCustomForm
{
    public int Id { get; set; }
    public int UserServiceId { get; set; }
    public int WorkflowStepId { get; set; }
    public string FormSchemaJson { get; set; } = string.Empty;
    public string? ProductionWebhookUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UserServiceAccessContext
{
    public int UserServiceId { get; set; }
    public int ServiceId { get; set; }
    public int CompanyId { get; set; }
    public int OwnerUserId { get; set; }
    public bool UserServiceActive { get; set; }
    public int? AssignedDeveloperUserId { get; set; }
}

public static class WorkflowRoles
{
    public const string Trigger = "Trigger";
    public const string Action = "Action";
    public const string Output = "Output";

    public static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        Trigger,
        Action,
        Output
    };
}

public static class WorkflowStepStatuses
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string Failed = "Failed";
    public const string Disabled = "Disabled";

    public static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        Pending,
        Confirmed,
        Failed,
        Disabled
    };
}
