using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace CroutApi.Services;

public class N8nWorkflowClient(HttpClient httpClient, IOptions<N8nOptions> options) : IN8nWorkflowClient
{
    private readonly N8nOptions _options = options.Value;
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<N8nWorkflowDocument> CreateWorkflowAsync(string name, N8nWorkflowDocument workflow, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured())
        {
            workflow.Id = $"mock-{Slugify(name)}";
            workflow.Name = name;
            return workflow;
        }

        using var request = CreateRequest(HttpMethod.Post, "api/v1/workflows", new
        {
            name,
            nodes = workflow.Nodes,
            connections = workflow.Connections,
            settings = workflow.Settings
        });
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(response, body);
        return ParseWorkflow(body, workflow);
    }

    public async Task<N8nWorkflowDocument> UpdateWorkflowAsync(string workflowId, N8nWorkflowDocument workflow, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured())
        {
            workflow.Id = workflowId;
            return workflow;
        }

        using var request = CreateRequest(HttpMethod.Put, $"api/v1/workflows/{workflowId}", new
        {
            id = workflowId,
            name = workflow.Name,
            nodes = workflow.Nodes,
            connections = workflow.Connections,
            settings = workflow.Settings
        });
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(response, body);
        return ParseWorkflow(body, workflow);
    }

    public async Task ActivateWorkflowAsync(string workflowId, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured()) return;
        using var request = CreateRequest(HttpMethod.Post, $"api/v1/workflows/{workflowId}/activate");
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(response, body);
    }

    public async Task DeactivateWorkflowAsync(string workflowId, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured()) return;
        using var request = CreateRequest(HttpMethod.Post, $"api/v1/workflows/{workflowId}/deactivate");
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        EnsureSuccess(response, body);
    }

    private bool IsConfigured() =>
        !string.IsNullOrWhiteSpace(_options.BaseUrl) &&
        !string.IsNullOrWhiteSpace(_options.ApiKey);

    private HttpRequestMessage CreateRequest(HttpMethod method, string relativeUrl, object? body = null)
    {
        var baseUrl = _options.BaseUrl.TrimEnd('/') + "/";
        var request = new HttpRequestMessage(method, new Uri(new Uri(baseUrl), relativeUrl));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        request.Headers.Add("X-N8N-API-KEY", _options.ApiKey);

        if (body is not null)
        {
            request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        }

        return request;
    }

    private void EnsureSuccess(HttpResponseMessage response, string body)
    {
        if (response.IsSuccessStatusCode) return;
        throw new InvalidOperationException(
            string.IsNullOrWhiteSpace(body)
                ? $"n8n returned {(int)response.StatusCode}."
                : $"n8n returned {(int)response.StatusCode}: {body}");
    }

    private N8nWorkflowDocument ParseWorkflow(string body, N8nWorkflowDocument fallback)
    {
        if (string.IsNullOrWhiteSpace(body)) return fallback;

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        if (root.TryGetProperty("data", out var data))
        {
            root = data;
        }

        return new N8nWorkflowDocument
        {
            Id = root.TryGetProperty("id", out var id) ? id.ToString() : fallback.Id,
            Name = root.TryGetProperty("name", out var name) ? name.GetString() ?? fallback.Name : fallback.Name,
            Active = root.TryGetProperty("active", out var active) && active.ValueKind == JsonValueKind.True,
            Nodes = fallback.Nodes,
            Connections = fallback.Connections,
            Settings = fallback.Settings
        };
    }

    private static string Slugify(string value) =>
        new string(value
            .ToLowerInvariant()
            .Select(ch => char.IsLetterOrDigit(ch) ? ch : '-')
            .ToArray())
            .Replace("--", "-");
}
