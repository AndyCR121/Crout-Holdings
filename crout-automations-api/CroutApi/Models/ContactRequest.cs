namespace CroutApi.Models;

public class ContactRequest
{
    public int ContactRequestId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Business { get; set; }
    public string Service { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Referral { get; set; }
    public string? ConfigJson { get; set; }
    public string? Source { get; set; }
    public bool EmailSent { get; set; }
    public DateTime CreatedAt { get; set; }
}
