namespace CroutApi.DTOs;

public class CreateAdminServiceDto
{
    public string? ServiceName { get; set; }
    public string? ServiceDescription { get; set; }
    public decimal? BaseCost { get; set; }
    public decimal? TokensCost { get; set; }
    public long? TotalTokens { get; set; }
    public bool HasAddons { get; set; }
    public bool Conditional { get; set; }
    public string? DisplayName { get; set; }
    public string? DisplayTagline { get; set; }
    public string? IconKey { get; set; }
    public string? IconSvg { get; set; }
    public int? DisplayOrder { get; set; }
}

public class UpdateAdminServiceDto
{
    public string? ServiceName { get; set; }
    public string? ServiceDescription { get; set; }
    public decimal? BaseCost { get; set; }
    public decimal? TokensCost { get; set; }
    public long? TotalTokens { get; set; }
    public bool? HasAddons { get; set; }
    public bool? Conditional { get; set; }
    public string? DisplayName { get; set; }
    public string? DisplayTagline { get; set; }
    public string? IconKey { get; set; }
    public string? IconSvg { get; set; }
    public int? DisplayOrder { get; set; }
}
