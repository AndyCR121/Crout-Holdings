namespace CroutApi.Models;

public class DeveloperAssignedFormContext
{
    public int UserServiceId { get; set; }
    public int ServiceId { get; set; }
    public int? IntegrationId { get; set; }
    public string? WorkflowId { get; set; }
    public string? WebhookUrl { get; set; }
}
