namespace CroutApi.Models;

/// <summary>One recipient address a share_method='email' link was sent to. See design.md D8.</summary>
public class CustomFormShareLinkRecipient
{
    public int RecipientId { get; set; }
    public int ShareLinkId { get; set; }
    public string Email { get; set; } = string.Empty;
}

public static class CustomFormShareMethods
{
    public const string Url = "url";
    public const string Email = "email";
}
