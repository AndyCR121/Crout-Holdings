namespace CroutApi.DTOs.Auth;

public record UserDto(
    int UserId,
    string Username,
    string FirstName,
    string Surname,
    string Email,
    string? CellNumber,
    bool IsAdmin,
    string? ProfilePicture = null
);
