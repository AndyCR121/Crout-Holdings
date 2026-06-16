namespace CroutApi.Models;

public class UserService
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public int ServiceId { get; set; }
    public int? PackageId { get; set; }
    public string? SubscriptionId { get; set; }
    public string? Config { get; set; }
    public bool Active { get; set; } = true;
    public int Status { get; set; } = 0;
}
