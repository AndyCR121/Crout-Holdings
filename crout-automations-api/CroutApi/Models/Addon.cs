namespace CroutApi.Models;

public class Addon
{
    public int AddonId { get; set; }
    public int? ServiceId { get; set; }
    public string AddonName { get; set; } = string.Empty;
    public string? AddonDescription { get; set; }
    public string Type { get; set; } = WorkflowRoles.Action;
    public decimal MonthlyPrice { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
    public List<int> ServiceIds { get; set; } = [];
    public List<WorkflowIntegrationDefinition> Integrations { get; set; } = [];

    // Compatibility aliases for older frontend consumers.
    public decimal Price => MonthlyPrice;
}
