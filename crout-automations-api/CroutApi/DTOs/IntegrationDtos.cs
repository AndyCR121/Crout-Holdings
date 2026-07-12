namespace CroutApi.DTOs;

public class IntegrationSummaryDto
{
    public string WorkflowName { get; set; } = string.Empty;
    public string Status { get; set; } = Models.IntegrationStatuses.Development;
    public string? LastError { get; set; }
    public DateTime? PublishedDate { get; set; }
    public DateTime? PausedDate { get; set; }
}

public class IntegrationLifecycleResponseDto
{
    public int UserServiceId { get; set; }
    public IntegrationSummaryDto Integration { get; set; } = new();
}

public class IntegrationStatusDto
{
    public int UserServiceId { get; set; }
    public string LifecycleStatus { get; set; } = Models.IntegrationStatuses.Development;
    public string PublicationStatus { get; set; } = "Unknown";
    public string CredentialStatus { get; set; } = "NotRequired";
    public string AccessStatus { get; set; } = "Unknown";
    public string StatusSource { get; set; } = "DatabaseFallback";
    public bool WorkflowExists { get; set; }
    public bool? WorkflowActive { get; set; }
    public bool? ExpectedTagsPresent { get; set; }
    public bool HasMismatch { get; set; }
    public string? WorkflowId { get; set; }
    public string? Message { get; set; }
}

public class UserServiceIntegrationContextDto
{
    public int UserServiceId { get; set; }
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string? Config { get; set; }
    public int? AssignedDeveloperUserId { get; set; }
    public string? AssignedDeveloperName { get; set; }
}
