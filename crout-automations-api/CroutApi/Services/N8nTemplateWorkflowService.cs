using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using CroutApi.DTOs;
using CroutApi.Models;

namespace CroutApi.Services;

public sealed class N8nTemplateWorkflowService(IN8nWorkflowClient workflows)
{
    private const string TemplateTag = "__template";
    private const string ManagedTag = "managed-by-crout";
    private const string ManagedNotesNodeName = "CROUT_SERVICE_NOTES";

    public async Task<ResolvedTemplate> ResolveAsync(Integration integration, UserServiceIntegrationContextDto context, CancellationToken cancellationToken)
    {
        var expectedServiceTag = NormalizeServiceTag(context.ServiceName);
        if (!string.IsNullOrWhiteSpace(integration.TemplateWorkflowId))
        {
            var cached = await workflows.GetWorkflowAsync(integration.TemplateWorkflowId, cancellationToken);
            if (cached is not null && IsMatchingTemplate(cached, expectedServiceTag))
                return Validate(cached, expectedServiceTag);
        }

        var candidates = (await workflows.SearchWorkflowsAsync(cancellationToken))
            .Where(workflow => HasTag(workflow, TemplateTag))
            .ToArray();

        foreach (var candidate in candidates)
            ValidateTemplateTagShape(candidate);

        var matches = candidates.Where(workflow => HasTag(workflow, expectedServiceTag)).ToArray();
        if (matches.Length == 0)
            throw new ArgumentException($"No inactive n8n template was found for service tag '{expectedServiceTag}'.");
        if (matches.Length > 1)
            throw new ArgumentException($"More than one n8n template was found for service tag '{expectedServiceTag}'.");

        var complete = await workflows.GetWorkflowAsync(matches[0].Id ?? throw new InvalidOperationException("Template workflow did not include an ID."), cancellationToken)
            ?? throw new ArgumentException("The resolved n8n template could not be read.");
        return Validate(complete, expectedServiceTag);
    }

    public N8nWorkflowDocument Clone(ResolvedTemplate template, Integration integration, UserServiceIntegrationContextDto context)
    {
        var clone = new N8nWorkflowDocument
        {
            Name = $"{context.CompanyName} | {context.ServiceName}",
            Active = false,
            Nodes = template.Workflow.Nodes.DeepClone() as JsonArray ?? [],
            Connections = template.Workflow.Connections.DeepClone() as JsonObject ?? [],
            Settings = template.Workflow.Settings.DeepClone() as JsonObject ?? [],
            StaticData = template.Workflow.StaticData?.DeepClone(),
            PinData = template.Workflow.PinData?.DeepClone(),
            Meta = template.Workflow.Meta?.DeepClone() as JsonObject,
            Tags = BuildClientTags(context)
        };
        StripGeneratedFields(clone);
        UpdateManagedNotes(clone, context);
        return clone;
    }

    public void SynchronizeManagedContent(N8nWorkflowDocument workflow, UserServiceIntegrationContextDto context)
    {
        workflow.Name = $"{context.CompanyName} | {context.ServiceName}";
        workflow.Active = false;
        workflow.Tags = BuildClientTags(context);
        UpdateManagedNotes(workflow, context);
    }

    public static string NormalizeServiceTag(string serviceName) => "s:" + Normalize(serviceName, allowHyphen: true);

    public static string NormalizeCompanyTag(string companyName) => "c:" + Normalize(companyName, allowHyphen: false);

    public static bool HasExpectedClientTags(N8nWorkflowDocument workflow, UserServiceIntegrationContextDto context)
    {
        var expected = new[] { NormalizeServiceTag(context.ServiceName), NormalizeCompanyTag(context.CompanyName), $"us:{context.UserServiceId}", ManagedTag };
        return expected.All(tag => HasTag(workflow, tag)) && !HasTag(workflow, TemplateTag);
    }

    public static bool HasManagedNotesNode(N8nWorkflowDocument workflow) =>
        workflow.Nodes.OfType<JsonObject>().Any(node =>
            string.Equals(node["name"]?.GetValue<string>(), ManagedNotesNodeName, StringComparison.Ordinal));

    private static ResolvedTemplate Validate(N8nWorkflowDocument workflow, string expectedServiceTag)
    {
        ValidateTemplateTagShape(workflow);
        if (!IsMatchingTemplate(workflow, expectedServiceTag))
            throw new ArgumentException($"The n8n template does not contain the expected service tag '{expectedServiceTag}'.");
        if (workflow.Active)
            throw new ArgumentException("n8n workflow templates must be inactive.");
        FindManagedNotesNode(workflow);

        var snapshot = JsonSerializer.Serialize(workflow);
        return new ResolvedTemplate(
            workflow,
            workflow.Id ?? throw new ArgumentException("The n8n template has no workflow ID."),
            expectedServiceTag,
            workflow.Meta?["versionId"]?.ToString() ?? "unknown",
            Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(snapshot))),
            DateTime.UtcNow);
    }

    private static void ValidateTemplateTagShape(N8nWorkflowDocument workflow)
    {
        var tags = GetTags(workflow).ToArray();
        var serviceTags = tags.Where(tag => tag.StartsWith("s:", StringComparison.OrdinalIgnoreCase)).ToArray();
        if (HasTag(workflow, TemplateTag) && serviceTags.Length != 1)
            throw new ArgumentException("Each n8n workflow template must have exactly one service tag.");
        if (HasTag(workflow, TemplateTag) && serviceTags.Length == 1 && string.IsNullOrWhiteSpace(serviceTags[0][2..]))
            throw new ArgumentException("The n8n workflow template has an invalid service tag.");
    }

    private static bool IsMatchingTemplate(N8nWorkflowDocument workflow, string expectedServiceTag) =>
        HasTag(workflow, TemplateTag) && HasTag(workflow, expectedServiceTag);

    private static JsonArray BuildClientTags(UserServiceIntegrationContextDto context) =>
    [
        NormalizeServiceTag(context.ServiceName),
        NormalizeCompanyTag(context.CompanyName),
        $"us:{context.UserServiceId}",
        ManagedTag
    ];

    private static void StripGeneratedFields(N8nWorkflowDocument workflow)
    {
        workflow.Id = null;
        workflow.Meta?.Remove("versionId");
        workflow.Meta?.Remove("activeVersionId");
        workflow.Meta?.Remove("shared");
        workflow.Meta?.Remove("owner");
        workflow.Meta?.Remove("homeProject");
        foreach (var node in workflow.Nodes.OfType<JsonObject>())
        {
            node.Remove("id");
            node.Remove("createdAt");
            node.Remove("updatedAt");
        }
    }

    private static void UpdateManagedNotes(N8nWorkflowDocument workflow, UserServiceIntegrationContextDto context)
    {
        var node = FindManagedNotesNode(workflow);
        var parameters = node["parameters"] as JsonObject ?? new JsonObject();
        node["parameters"] = parameters;
        parameters["content"] = BuildNotes(context);
    }

    private static JsonObject FindManagedNotesNode(N8nWorkflowDocument workflow) =>
        workflow.Nodes.OfType<JsonObject>().SingleOrDefault(node =>
            string.Equals(node["name"]?.GetValue<string>(), ManagedNotesNodeName, StringComparison.Ordinal))
        ?? throw new ArgumentException($"The template must include a Sticky Note named '{ManagedNotesNodeName}'.");

    private static string BuildNotes(UserServiceIntegrationContextDto context)
    {
        var config = ParseConfig(context.Config);
        var developerName = string.IsNullOrWhiteSpace(context.AssignedDeveloperName) ? "Unassigned" : context.AssignedDeveloperName.Trim();
        return $"""
            # Crout Service Configuration
            
            **Company:** {context.CompanyName}
            **Service:** {context.ServiceName}
            **UserService ID:** {context.UserServiceId}
            **Assigned developer:** {developerName}
            **Confirmed:** {DateTime.UtcNow:O}
            **Configuration version:** {config["version"]?.ToString() ?? "Not specified"}
            **Credential status:** Not evaluated
            
            ## Confirmed triggers
            {ListValues(config, "trigger")}
            
            ## Confirmed actions
            {ListValues(config, "action")}
            
            ## Confirmed outputs
            {ListValues(config, "output")}
            
            ## Selected add-ons
            {ListValues(config, "confirmedAddons")}
            
            ## Selected integrations
            {ListValues(config, "integrations")}
            
            ## Integration-specific developer notes
            {SafeNote(config, "integrationDeveloperNotes")}
            
            ## General developer notes
            {SafeNote(config, "developerNotes")}
            
            > Do not rename or delete this managed node. Credential values are never stored here.
            """;
    }

    private static string SafeNote(JsonObject config, string key) =>
        config[key]?.GetValue<string>()?.Trim() is { Length: > 0 } value ? value : "None";

    private static string ListValues(JsonObject config, string key)
    {
        if (config[key] is not JsonArray values || values.Count == 0) return "- None";
        return string.Join(Environment.NewLine, values.Select(value => $"- {value?.ToString() ?? ""}"));
    }

    private static JsonObject ParseConfig(string? config) =>
        string.IsNullOrWhiteSpace(config) ? [] : JsonNode.Parse(config) as JsonObject ?? [];

    private static bool HasTag(N8nWorkflowDocument workflow, string expected) =>
        GetTags(workflow).Any(tag => string.Equals(tag, expected, StringComparison.OrdinalIgnoreCase));

    private static IEnumerable<string> GetTags(N8nWorkflowDocument workflow) => workflow.Tags
        .Select(tag => tag switch
        {
            JsonValue value when value.TryGetValue<string>(out var name) => name,
            JsonObject obj => obj["name"]?.GetValue<string>() ?? string.Empty,
            _ => string.Empty
        })
        .Where(tag => !string.IsNullOrWhiteSpace(tag));

    private static string Normalize(string value, bool allowHyphen)
    {
        var normalized = new string(value.Trim().Where(char.IsLetterOrDigit).ToArray());
        if (allowHyphen)
            normalized = string.Join('-', value.Trim().ToLowerInvariant().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Select(part => new string(part.Where(char.IsLetterOrDigit).ToArray())).Where(part => part.Length > 0));
        if (string.IsNullOrWhiteSpace(normalized))
            throw new ArgumentException("A usable service or company name is required for workflow tags.");
        return allowHyphen ? normalized.ToLowerInvariant() : normalized;
    }
}

public sealed record ResolvedTemplate(
    N8nWorkflowDocument Workflow,
    string WorkflowId,
    string ServiceTag,
    string Version,
    string SnapshotHash,
    DateTime ResolvedAt);
