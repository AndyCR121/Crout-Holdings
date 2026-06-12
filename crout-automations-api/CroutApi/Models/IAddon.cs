namespace CroutApi.Models;

public class IAddon
{
    public int     AddonId          { get; set; }
    public int     ServiceId        { get; set; }
    public string  AddonName        { get; set; } = string.Empty;
    public string? AddonDescription { get; set; }
    public decimal Price            { get; set; }
}
