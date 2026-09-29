namespace CroutApi.Models;

public class CustomFormShareLink
{
    public int ShareLinkId { get; set; }
    public int UserServiceId { get; set; }
    public int CreatedByUserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string ShareMethod { get; set; } = CustomFormShareMethods.Url;

    public bool IsActive(DateTime utcNow) => RevokedAt is null && ExpiresAt > utcNow;
}
