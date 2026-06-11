using System.ComponentModel.DataAnnotations;

namespace CroutApi.DTOs.Profile;

public record ChangePasswordRequest(
    [Required] string CurrentPassword,
    [Required][MinLength(8)] string NewPassword
);
