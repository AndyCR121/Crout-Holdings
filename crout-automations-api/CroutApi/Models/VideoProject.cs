namespace CroutApi.Models;

public class VideoProject
{
    public int VideoProjectId { get; set; }
    public int CompanyId { get; set; }
    public int? UserServiceId { get; set; }
    public int ServiceId { get; set; }
    public string Title { get; set; } = "";
    public string Status { get; set; } = "draft";
    public DateTime? ScheduledFor { get; set; }
    public string Platform { get; set; } = "instagram";
    public string? OutputUrl { get; set; }
    public string? MetadataJson { get; set; }
    public string? TimelineJson { get; set; }
    public int TimelineVersion { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
