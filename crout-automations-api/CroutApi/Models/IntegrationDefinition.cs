namespace CroutApi.Models;

public class IntegrationDefinition
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string IntegrationType { get; set; } = string.Empty;
    public bool HasCredentials { get; set; }
    public string? CredentialFormSchemaJson { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public static class WorkflowRoles
{
    public const string Trigger = "Trigger";
    public const string Action = "Action";
    public const string Output = "Output";

    public static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        Trigger,
        Action,
        Output
    };
}
