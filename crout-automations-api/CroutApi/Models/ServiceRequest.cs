namespace CroutApi.Models;

public class ServiceRequest
{
    public int RequestId { get; set; }
    public int CompanyId { get; set; }
    public int ServiceId { get; set; }
    public int? PackageId { get; set; }
    public string? RequestNote { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; }
}
