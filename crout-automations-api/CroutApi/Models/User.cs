namespace CroutApi.Models;

public class User
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string Surname { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? CellNumber { get; set; }
    public bool Active { get; set; } = true;
    public bool IsAdmin { get; set; }
    public string? ProfilePicture { get; set; }
}
