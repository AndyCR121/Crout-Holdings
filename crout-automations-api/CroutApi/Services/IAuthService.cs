using CroutApi.DTOs.Auth;

namespace CroutApi.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    Task<LoginResponse> RegisterAsync(RegisterRequest request);
    Task<PasswordResetSessionResponse> RequestPasswordResetAsync(PasswordResetRequest request);
    Task<PasswordResetSessionResponse> ResendPasswordResetAsync(PasswordResetResendRequest request);
    Task VerifyPasswordResetOtpAsync(PasswordResetVerifyRequest request);
    Task CompletePasswordResetAsync(PasswordResetCompleteRequest request);
}
