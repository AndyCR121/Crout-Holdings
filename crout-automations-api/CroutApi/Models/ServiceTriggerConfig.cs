namespace CroutApi.Models;

public class ServiceTriggerConfig
{
    public int ServiceTriggerConfigId { get; set; }
    public int ServiceId { get; set; }
    public int? UserServiceId { get; set; }
    public string? WorkflowId { get; set; }
    public string TriggerType { get; set; } = "";
    public string Label { get; set; } = "";
    public string? Description { get; set; }
    public string? EndpointPath { get; set; }
    public string Method { get; set; } = "POST";
    public bool RequiresConfirmation { get; set; }
    public string? PayloadTemplate { get; set; }
    public string? FieldsJson { get; set; }
    public string? FileUploadJson { get; set; }
    public string ResponseMode { get; set; } = "inline";
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}
