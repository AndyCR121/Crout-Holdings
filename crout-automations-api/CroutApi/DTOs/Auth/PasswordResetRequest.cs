using System.ComponentModel.DataAnnotations;

namespace CroutApi.DTOs.Auth;

public record PasswordResetRequest(
    [Required][EmailAddress] string Email
);
