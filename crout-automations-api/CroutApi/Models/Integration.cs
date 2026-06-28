namespace CroutApi.Models;

public class Integration
{
    public int IntegrationId { get; set; }
    public int UserServiceId { get; set; }
    public int CompanyId { get; set; }
    public string? WorkflowId { get; set; }
    public string WorkflowName { get; set; } = string.Empty;
    public string Status { get; set; } = IntegrationStatuses.Development;
    public int? PublishedBy { get; set; }
    public DateTime? PublishedDate { get; set; }
    public int? PausedBy { get; set; }
    public DateTime? PausedDate { get; set; }
    public string? LastError { get; set; }
    public string? NodeMappingsJson { get; set; }
    public string? WorkflowDefinitionJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public static class IntegrationStatuses
{
    public const string Development = "Development";
    public const string Live = "Live";
    public const string Paused = "Paused";
    public const string Failed = "Failed";
}
