namespace CroutApi.Models;

public class PasswordResetOtp
{
    public int PasswordResetOtpId { get; set; }
    public string ResetRequestId { get; set; } = string.Empty;
    public int UserId { get; set; }
    public string OtpHash { get; set; } = string.Empty;
    public int AttemptCount { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime? ConsumedAt { get; set; }
    public DateTime? InvalidatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
