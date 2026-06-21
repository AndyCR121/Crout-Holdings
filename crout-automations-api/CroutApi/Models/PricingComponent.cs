namespace CroutApi.Models;

public class PricingComponent
{
    public int PricingComponentId { get; set; }
    public string ComponentKey { get; set; } = string.Empty;
    public string ComponentName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string PricingType { get; set; } = "fixed";
    public decimal Amount { get; set; }
    public bool IsRequiredDefault { get; set; }
    public bool IsActive { get; set; } = true;
}
