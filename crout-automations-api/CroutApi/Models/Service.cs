namespace CroutApi.Models;

public class Service
{
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool HasAddons { get; set; }
    public bool Conditional { get; set; }
    public string? ServiceDescription { get; set; }
    public List<string> Features { get; set; } = [];
}
