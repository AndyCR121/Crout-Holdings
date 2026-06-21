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
    public decimal SubscriptionAmount { get; set; }
    public string? PricingSnapshot { get; set; }
    public DateTime? PaymentDate { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime CreatedAt { get; set; }
}
