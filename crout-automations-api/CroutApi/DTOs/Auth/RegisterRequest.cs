using System.ComponentModel.DataAnnotations;

namespace CroutApi.DTOs.Auth;

public record RegisterRequest(
    [Required] string Username,
    [Required] string Password,
    [Required] string FirstName,
    [Required] string Surname,
    [Required][EmailAddress] string Email,
    string? CellNumber
);
