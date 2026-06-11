using System.ComponentModel.DataAnnotations;

namespace CroutApi.DTOs.Profile;

public record UpdateProfileRequest(
    [Required] string FirstName,
    [Required] string Surname,
    [Required][EmailAddress] string Email,
    string? CellNumber
);
