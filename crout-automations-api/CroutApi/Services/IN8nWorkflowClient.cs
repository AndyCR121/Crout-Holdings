using System.Text.Json.Nodes;

namespace CroutApi.Services;

public interface IN8nWorkflowClient
{
    Task<IReadOnlyList<N8nWorkflowDocument>> SearchWorkflowsAsync(CancellationToken cancellationToken = default);
    Task<N8nWorkflowDocument?> GetWorkflowAsync(string workflowId, CancellationToken cancellationToken = default);
    Task<N8nWorkflowDocument> CreateWorkflowAsync(string name, N8nWorkflowDocument workflow, CancellationToken cancellationToken = default);
    Task<N8nWorkflowDocument> UpdateWorkflowAsync(string workflowId, N8nWorkflowDocument workflow, CancellationToken cancellationToken = default);
    Task UpdateWorkflowTagsAsync(string workflowId, JsonArray tags, CancellationToken cancellationToken = default);
    Task ActivateWorkflowAsync(string workflowId, CancellationToken cancellationToken = default);
    Task DeactivateWorkflowAsync(string workflowId, CancellationToken cancellationToken = default);
}

public class N8nWorkflowDocument
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool Active { get; set; }
    public JsonArray Nodes { get; set; } = [];
    public JsonObject Connections { get; set; } = [];
    public JsonObject Settings { get; set; } = [];
    public JsonArray Tags { get; set; } = [];
    public JsonNode? StaticData { get; set; }
    public JsonNode? PinData { get; set; }
    public JsonObject? Meta { get; set; }
}
