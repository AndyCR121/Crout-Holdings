namespace CroutApi.Models;

public class Service
{
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public decimal BaseCost { get; set; } = 5000m;
    public decimal TokensCost { get; set; } = 1000m;
    public long TotalTokens { get; set; } = 6_000_000;
    public bool HasAddons { get; set; }
    public bool Conditional { get; set; }
    public bool Active { get; set; } = true;
    public string? ServiceDescription { get; set; }
    public string? DisplayName { get; set; }
    public string? DisplayTagline { get; set; }
    public string? IconKey { get; set; }
    public string? IconSvg { get; set; }
    public int? DisplayOrder { get; set; }
    public List<string> Features { get; set; } = [];
    public List<Addon> Addons { get; set; } = [];

    // Compatibility alias for older frontend pricing consumers.
    public decimal Price => BaseCost + TokensCost;
}
