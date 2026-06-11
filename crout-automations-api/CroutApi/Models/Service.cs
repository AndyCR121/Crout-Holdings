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

public class Addon
{
    public int AddonId { get; set; }
    public int ServiceId { get; set; }
    public string AddonName { get; set; } = string.Empty;
    public string? AddonDescription { get; set; }
    public decimal Price { get; set; }
}

public class Package
{
    public int PackageId { get; set; }
    public int? ParentPackageId { get; set; }
    public string PackageName { get; set; } = string.Empty;
    public string? PackageDescription { get; set; }
    public decimal Discount { get; set; }
    public int? MinimumRequiredAddons { get; set; }
    public List<int> ServiceIds { get; set; } = [];
}
