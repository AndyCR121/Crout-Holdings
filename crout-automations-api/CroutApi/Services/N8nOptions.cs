namespace CroutApi.Services;

public class N8nOptions
{
    public string BaseUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string WorkspaceId { get; set; } = string.Empty;
    public string DefaultProjectId { get; set; } = string.Empty;
    public bool EnableLocalMockMode { get; set; }
    public bool EnableCredentialApi { get; set; }
    public bool RequireDeveloperAccess { get; set; }
}
