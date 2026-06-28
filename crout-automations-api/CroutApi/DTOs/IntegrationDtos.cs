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

public class UserServiceIntegrationContextDto
{
    public int UserServiceId { get; set; }
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string? Config { get; set; }
}
