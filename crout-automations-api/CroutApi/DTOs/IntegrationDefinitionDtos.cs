using System.Text.Json;

namespace CroutApi.DTOs;

public class IntegrationDefinitionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string IntegrationType { get; set; } = string.Empty;
    public bool HasCredentials { get; set; }
    public JsonElement? CredentialFormSchema { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpsertIntegrationDefinitionDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? IntegrationType { get; set; }
    public bool HasCredentials { get; set; }
    public JsonElement? CredentialFormSchema { get; set; }
    public bool IsActive { get; set; } = true;
}
