namespace CroutApi.Models;

public class DevService
{
    public int DevServiceId { get; set; }
    public int UserId { get; set; }
    public int UserServiceId { get; set; }
    public decimal CommissionPerc { get; set; } = 20.00m;
    public decimal Cost { get; set; }
    public decimal TotalCommission { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
