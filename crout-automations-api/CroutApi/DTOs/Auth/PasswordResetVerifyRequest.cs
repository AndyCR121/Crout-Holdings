using System.ComponentModel.DataAnnotations;

namespace CroutApi.DTOs.Auth;

public record PasswordResetVerifyRequest(
    [Required] string ResetRequestId,
    [Required][RegularExpression(@"^\d{6}$")] string Otp
);
