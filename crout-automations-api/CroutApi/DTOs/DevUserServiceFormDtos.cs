using System.Text.Json;

namespace CroutApi.DTOs;

public class UpsertDevUserServiceFormDto
{
    public string? Label { get; set; }
    public string? Description { get; set; }
    public string? ResponseMode { get; set; }
    public JsonElement? PayloadTemplate { get; set; }
    public JsonElement Schema { get; set; }
}

public class DevUserServiceFormDto
{
    public int FormId { get; set; }
    public int UserServiceId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ResponseMode { get; set; } = "inline";
    public JsonElement PayloadTemplate { get; set; }
    public JsonElement Schema { get; set; }
    public int SchemaVersion { get; set; } = 2;
    public DateTime? UpdatedAtUtc { get; set; }
}
