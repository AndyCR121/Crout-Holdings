using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace CroutApi.Services;

public class N8nWorkflowClient(
    HttpClient httpClient,
    IOptions<N8nOptions> options,
    IHostEnvironment environment) : IN8nWorkflowClient
{
    private readonly N8nOptions _options = options.Value;

    public async Task<IReadOnlyList<N8nWorkflowDocument>> SearchWorkflowsAsync(CancellationToken cancellationToken = default)
    {
        if (UseLocalMockMode()) return [];

        using var request = CreateRequest(HttpMethod.Get, "api/v1/workflows?limit=250");
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(response, body);

        var root = JsonNode.Parse(body);
        var workflows = root?["data"] as JsonArray ?? root as JsonArray ?? [];
        return workflows
            .OfType<JsonObject>()
            .Select(workflow => ParseWorkflow(workflow))
            .ToArray();
    }

    public async Task<N8nWorkflowDocument?> GetWorkflowAsync(string workflowId, CancellationToken cancellationToken = default)
    {
        if (UseLocalMockMode()) return null;

        using var request = CreateRequest(HttpMethod.Get, $"api/v1/workflows/{Uri.EscapeDataString(workflowId)}");
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound) return null;
        EnsureSuccess(response, body);

        var root = JsonNode.Parse(body);
        return ParseWorkflow(root?["data"] as JsonObject ?? root as JsonObject ?? []);
    }

    public async Task<N8nWorkflowDocument> CreateWorkflowAsync(string name, N8nWorkflowDocument workflow, CancellationToken cancellationToken = default)
    {
        workflow.Name = name;
        workflow.Active = false;
        if (UseLocalMockMode())
        {
            workflow.Id = $"mock-{Slugify(name)}";
            return workflow;
        }

        using var request = CreateRequest(HttpMethod.Post, "api/v1/workflows", ToPayload(workflow));
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(response, body);
        return MergeResponse(body, workflow);
    }

    public async Task<N8nWorkflowDocument> UpdateWorkflowAsync(string workflowId, N8nWorkflowDocument workflow, CancellationToken cancellationToken = default)
    {
        workflow.Id = workflowId;
        if (UseLocalMockMode()) return workflow;

        using var request = CreateRequest(HttpMethod.Put, $"api/v1/workflows/{Uri.EscapeDataString(workflowId)}", ToPayload(workflow));
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(response, body);
        return MergeResponse(body, workflow);
    }

    public async Task UpdateWorkflowTagsAsync(string workflowId, JsonArray tags, CancellationToken cancellationToken = default)
    {
        if (UseLocalMockMode()) return;

        var requestedNames = tags.Select(tag => tag switch
            {
                JsonValue value when value.TryGetValue<string>(out var name) => name,
                JsonObject value => value["name"]?.GetValue<string>(),
                _ => null
            })
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        using var listRequest = CreateRequest(HttpMethod.Get, "api/v1/tags?limit=250");
        using var listResponse = await httpClient.SendAsync(listRequest, cancellationToken);
        var listBody = await listResponse.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(listResponse, listBody);
        var knownTags = (JsonNode.Parse(listBody)?["data"] as JsonArray ?? [])
            .OfType<JsonObject>()
            .ToDictionary(tag => tag["name"]?.GetValue<string>() ?? string.Empty, tag => tag["id"]?.GetValue<string>() ?? string.Empty, StringComparer.OrdinalIgnoreCase);

        var tagIds = new List<string>();
        foreach (var name in requestedNames)
        {
            if (!knownTags.TryGetValue(name, out var tagId))
            {
                using var createRequest = CreateRequest(HttpMethod.Post, "api/v1/tags", new { name });
                using var createResponse = await httpClient.SendAsync(createRequest, cancellationToken);
                var createBody = await createResponse.Content.ReadAsStringAsync(cancellationToken);
                EnsureSuccess(createResponse, createBody);
                var created = JsonNode.Parse(createBody)?["data"] as JsonObject ?? JsonNode.Parse(createBody) as JsonObject ?? [];
                tagId = created["id"]?.GetValue<string>() ?? throw new InvalidOperationException("n8n did not return an ID for the created tag.");
                knownTags[name] = tagId;
            }
            tagIds.Add(tagId);
        }

        using var updateRequest = CreateRequest(HttpMethod.Put, $"api/v1/workflows/{Uri.EscapeDataString(workflowId)}/tags", tagIds.Select(id => new { id }).ToArray());
        using var updateResponse = await httpClient.SendAsync(updateRequest, cancellationToken);
        var updateBody = await updateResponse.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(updateResponse, updateBody);
    }

    public async Task ActivateWorkflowAsync(string workflowId, CancellationToken cancellationToken = default)
    {
        if (UseLocalMockMode()) return;
        using var request = CreateRequest(HttpMethod.Post, $"api/v1/workflows/{Uri.EscapeDataString(workflowId)}/activate");
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(response, body);
    }

    public async Task DeactivateWorkflowAsync(string workflowId, CancellationToken cancellationToken = default)
    {
        if (UseLocalMockMode()) return;
        using var request = CreateRequest(HttpMethod.Post, $"api/v1/workflows/{Uri.EscapeDataString(workflowId)}/deactivate");
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(response, body);
    }

    private bool UseLocalMockMode() =>
        environment.IsDevelopment() &&
        _options.EnableLocalMockMode &&
        (!IsConfigured());

    private bool IsConfigured() =>
        !string.IsNullOrWhiteSpace(_options.BaseUrl) &&
        !string.IsNullOrWhiteSpace(_options.ApiKey);

    private HttpRequestMessage CreateRequest(HttpMethod method, string relativeUrl, object? body = null)
    {
        if (!IsConfigured())
            throw new InvalidOperationException("n8n BaseUrl and ApiKey must be configured unless explicit local mock mode is enabled.");

        var baseUrl = _options.BaseUrl.TrimEnd('/') + "/";
        var request = new HttpRequestMessage(method, new Uri(new Uri(baseUrl), relativeUrl));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        request.Headers.Add("X-N8N-API-KEY", _options.ApiKey);
        if (body is not null)
            request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        return request;
    }

    private static object ToPayload(N8nWorkflowDocument workflow) => new
    {
        name = workflow.Name,
        nodes = workflow.Nodes,
        connections = workflow.Connections,
        settings = new { executionOrder = workflow.Settings["executionOrder"]?.GetValue<string>() ?? "v1" }
    };

    private static N8nWorkflowDocument MergeResponse(string body, N8nWorkflowDocument fallback)
    {
        if (string.IsNullOrWhiteSpace(body)) return fallback;
        var root = JsonNode.Parse(body);
        return ParseWorkflow(root?["data"] as JsonObject ?? root as JsonObject ?? [], fallback);
    }

    private static N8nWorkflowDocument ParseWorkflow(JsonObject value, N8nWorkflowDocument? fallback = null) => new()
    {
        Id = value["id"]?.ToString() ?? fallback?.Id,
        Name = value["name"]?.GetValue<string>() ?? fallback?.Name ?? string.Empty,
        Active = value["active"]?.GetValue<bool>() ?? fallback?.Active ?? false,
        Nodes = value["nodes"]?.DeepClone() as JsonArray ?? fallback?.Nodes?.DeepClone() as JsonArray ?? [],
        Connections = value["connections"]?.DeepClone() as JsonObject ?? fallback?.Connections?.DeepClone() as JsonObject ?? [],
        Settings = value["settings"]?.DeepClone() as JsonObject ?? fallback?.Settings?.DeepClone() as JsonObject ?? [],
        Tags = value["tags"]?.DeepClone() as JsonArray ?? fallback?.Tags?.DeepClone() as JsonArray ?? [],
        StaticData = value["staticData"]?.DeepClone() ?? fallback?.StaticData?.DeepClone(),
        PinData = value["pinData"]?.DeepClone() ?? fallback?.PinData?.DeepClone(),
        Meta = value["meta"]?.DeepClone() as JsonObject ?? fallback?.Meta?.DeepClone() as JsonObject
    };

    private static void EnsureSuccess(HttpResponseMessage response, string body)
    {
        if (response.IsSuccessStatusCode) return;
        throw new InvalidOperationException(string.IsNullOrWhiteSpace(body)
            ? $"n8n returned {(int)response.StatusCode}."
            : $"n8n returned {(int)response.StatusCode}: {body}");
    }

    private static string Slugify(string value) => new string(value.ToLowerInvariant().Select(ch => char.IsLetterOrDigit(ch) ? ch : '-').ToArray()).Replace("--", "-");
}
