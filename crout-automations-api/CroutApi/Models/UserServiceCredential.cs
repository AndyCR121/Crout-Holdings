namespace CroutApi.Models;

public sealed class UserServiceCredential
{
    public int Id { get; set; }
    public int UserServiceId { get; set; }
    public int CompanyId { get; set; }
    public int IntegrationDefinitionId { get; set; }
    public string EncryptedValues { get; set; } = string.Empty;
    public string Status { get; set; } = "Missing";
    public string? N8nCredentialId { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
