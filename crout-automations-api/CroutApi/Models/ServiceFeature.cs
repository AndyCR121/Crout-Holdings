namespace CroutApi.Models;

public class ServiceFeature
{
    public int    FeatureId { get; set; }
    public int    ServiceId { get; set; }
    public string Feature   { get; set; } = string.Empty;
    public int    SortOrder { get; set; }
}
