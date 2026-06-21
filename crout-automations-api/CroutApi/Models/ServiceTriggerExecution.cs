namespace CroutApi.Models;

public class ServiceTriggerExecution
{
    public int ServiceTriggerExecutionId { get; set; }
    public int ServiceTriggerConfigId { get; set; }
    public int UserId { get; set; }
    public int CompanyId { get; set; }
    public int? UserServiceId { get; set; }
    public string? RequestPayload { get; set; }
    public string? ResponsePayload { get; set; }
    public string Status { get; set; } = "queued";
    public string Mode { get; set; } = "mock";
    public string? ErrorMessage { get; set; }
}
