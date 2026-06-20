namespace CroutApi.DTOs;

public class DevPortalServiceDto
{
    public int? DevServiceId { get; set; }
    public int? UserId { get; set; }
    public int UserServiceId { get; set; }
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? CompanyEmail { get; set; }
    public string? CompanyPhone { get; set; }
    public string? CompanyAddress { get; set; }
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string? ServiceDescription { get; set; }
    public string? SubscriptionId { get; set; }
    public int Status { get; set; }
    public string? Config { get; set; }
    public string? PricingSnapshot { get; set; }
    public int GuideStep { get; set; }
    public bool IsMaintenance { get; set; }
    public decimal SubscriptionAmount { get; set; }
    public decimal CommissionPerc { get; set; } = 20.00m;
    public decimal TotalCommission { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? PaymentDate { get; set; }
}

public record DevGuideStepUpdateDto(int Step);
public record DevMaintenanceUpdateDto(bool IsMaintenance);

public class DevDashboardDto
{
    public int AssignedCount { get; set; }
    public int LiveCount { get; set; }
    public int InDevelopmentCount { get; set; }
    public int PendingCount { get; set; }
    public decimal MonthlySubscriptionTotal { get; set; }
    public decimal MonthlyCommissionTotal { get; set; }
    public IEnumerable<DevPortalServiceDto> RecentAssigned { get; set; } = [];
}
