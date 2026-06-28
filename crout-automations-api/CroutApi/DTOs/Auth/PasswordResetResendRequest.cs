using System.ComponentModel.DataAnnotations;

namespace CroutApi.DTOs.Auth;

public record PasswordResetResendRequest(
    [Required] string ResetRequestId
);
