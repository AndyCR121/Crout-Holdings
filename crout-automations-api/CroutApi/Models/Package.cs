namespace CroutApi.Models;

public class Package
{
    public int     PackageId              { get; set; }
    public int?    ParentPackageId        { get; set; }
    public string  PackageName            { get; set; } = string.Empty;
    public string? PackageDescription     { get; set; }
    public decimal Discount               { get; set; }
    public int?    MinimumRequiredAddons  { get; set; }
    public List<int> ServiceIds           { get; set; } = [];
}
