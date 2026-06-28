namespace CroutApi.Services;

public interface IN8nWorkflowClient
{
    Task<N8nWorkflowDocument> CreateWorkflowAsync(string name, N8nWorkflowDocument workflow, CancellationToken cancellationToken = default);
    Task<N8nWorkflowDocument> UpdateWorkflowAsync(string workflowId, N8nWorkflowDocument workflow, CancellationToken cancellationToken = default);
    Task ActivateWorkflowAsync(string workflowId, CancellationToken cancellationToken = default);
    Task DeactivateWorkflowAsync(string workflowId, CancellationToken cancellationToken = default);
}

public class N8nWorkflowDocument
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool Active { get; set; }
    public object[] Nodes { get; set; } = [];
    public Dictionary<string, object[]> Connections { get; set; } = [];
    public Dictionary<string, object?> Settings { get; set; } = [];
}
