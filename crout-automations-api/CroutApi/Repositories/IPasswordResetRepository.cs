using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IPasswordResetRepository
{
    Task CreateAsync(PasswordResetOtp otp);
    Task<PasswordResetOtp?> GetLatestByRequestIdAsync(string resetRequestId);
    Task InvalidateActiveByUserAsync(int userId);
    Task IncrementAttemptCountAsync(int passwordResetOtpId);
    Task MarkVerifiedAsync(int passwordResetOtpId);
    Task MarkInvalidatedAsync(int passwordResetOtpId);
    Task MarkConsumedByRequestIdAsync(string resetRequestId);
}
