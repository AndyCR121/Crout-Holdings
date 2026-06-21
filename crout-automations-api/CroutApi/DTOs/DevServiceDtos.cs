namespace CroutApi.DTOs;

public class DevServiceViewDto
{
    public int? DevServiceId { get; set; }
    public int? UserId { get; set; }
    public int UserServiceId { get; set; }
    public string? DeveloperName { get; set; }
    public string? DeveloperEmail { get; set; }
    public string? Referral { get; set; }
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string? SubscriptionId { get; set; }
    public int Status { get; set; }
    public decimal CommissionPerc { get; set; } = 20.00m;
    public decimal Cost { get; set; }
    public decimal TotalCommission { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateDevServiceDto
{
    public int UserId { get; set; }
    public int UserServiceId { get; set; }
    public decimal CommissionPerc { get; set; } = 20.00m;
    public decimal Cost { get; set; }
}

public class UpdateDevServiceDto
{
    public int UserId { get; set; }
    public decimal CommissionPerc { get; set; } = 20.00m;
    public decimal Cost { get; set; }
    public bool IsActive { get; set; } = true;
}
