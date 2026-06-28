using System.ComponentModel.DataAnnotations;

namespace CroutApi.DTOs.Auth;

public record PasswordResetCompleteRequest(
    [Required] string ResetRequestId,
    [Required] string NewPassword,
    [Required] string ConfirmPassword
);
