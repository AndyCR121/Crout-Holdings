using System.Text.Json;
using System.Text.Json.Nodes;
using CroutApi.DTOs;
using CroutApi.Helpers;
using CroutApi.Models;
using CroutApi.Repositories;
using Dapper;

namespace CroutApi.Services;

public class IntegrationService(
    IIntegrationRepository integrations,
    IUserServiceRepository userServices,
    IN8nWorkflowClient workflowClient,
    DbHelper db) : IIntegrationService
{
    public async Task<IntegrationSummaryDto> EnsureProvisionedAsync(int userServiceId, CancellationToken cancellationToken = default)
    {
        var lockName = $"integration:{userServiceId}:provision";
        await using var integrationLock = await AcquireLockAsync(lockName, cancellationToken);
        var existing = await integrations.GetByUserServiceIdAsync(userServiceId);
        if (existing?.WorkflowId is { Length: > 0 })
        {
            return ToSummary(existing);
        }

        var context = await userServices.GetIntegrationContextAsync(userServiceId)
            ?? throw new KeyNotFoundException("Client service not found.");

        if (existing is null)
        {
            var placeholder = new Integration
            {
                UserServiceId = userServiceId,
                CompanyId = context.CompanyId,
                WorkflowName = BuildWorkflowName(context),
                Status = IntegrationStatuses.Development
            };

            var created = await integrations.TryCreatePlaceholderAsync(placeholder);
            existing = created ? await integrations.GetByUserServiceIdAsync(userServiceId) : await integrations.GetByUserServiceIdAsync(userServiceId);
        }

        if (existing is null)
            throw new InvalidOperationException("Integration placeholder could not be created.");

        if (!string.IsNullOrWhiteSpace(existing.WorkflowId))
            return ToSummary(existing);

        var nodeMappingsJson = BuildNodeMappingsJson(context.Config, existing.NodeMappingsJson);
        var workflow = BuildWorkflow(existing.WorkflowName, context.Config, nodeMappingsJson);
        var createdWorkflow = await workflowClient.CreateWorkflowAsync(existing.WorkflowName, workflow, cancellationToken);
        var workflowDefinitionJson = JsonSerializer.Serialize(workflow);
        await integrations.UpdateProvisioningAsync(existing.IntegrationId, createdWorkflow.Id ?? $"mock-{userServiceId}", workflowDefinitionJson, nodeMappingsJson);

        existing = await integrations.GetByUserServiceIdAsync(userServiceId)
            ?? throw new InvalidOperationException("Integration provisioning result could not be reloaded.");
        return ToSummary(existing);
    }

    public async Task<IntegrationSummaryDto> SynchronizeAsync(int userServiceId, CancellationToken cancellationToken = default)
    {
        var provisioned = await EnsureProvisionedAsync(userServiceId, cancellationToken);
        var integration = await integrations.GetByUserServiceIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("Integration not found.");
        var context = await userServices.GetIntegrationContextAsync(userServiceId)
            ?? throw new KeyNotFoundException("Client service not found.");

        var nodeMappingsJson = BuildNodeMappingsJson(context.Config, integration.NodeMappingsJson);
        var workflow = BuildWorkflow(integration.WorkflowName, context.Config, nodeMappingsJson);
        var updated = await workflowClient.UpdateWorkflowAsync(integration.WorkflowId!, workflow, cancellationToken);
        await integrations.UpdateWorkflowStateAsync(
            integration.IntegrationId,
            integration.Status,
            null,
            integration.PublishedBy,
            integration.PublishedDate,
            integration.PausedBy,
            integration.PausedDate,
            JsonSerializer.Serialize(workflow),
            nodeMappingsJson);

        integration = await integrations.GetByUserServiceIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("Integration not found.");
        integration.WorkflowId = updated.Id ?? integration.WorkflowId;
        integration.LastError = null;
        return ToSummary(integration);
    }

    public async Task<IntegrationSummaryDto> PublishAsync(int userServiceId, int callerUserId, CancellationToken cancellationToken = default)
    {
        var lockName = $"integration:{userServiceId}:publish";
        await using var integrationLock = await AcquireLockAsync(lockName, cancellationToken);
        var context = await userServices.GetIntegrationContextAsync(userServiceId)
            ?? throw new KeyNotFoundException("Client service not found.");
        ValidatePublishable(context.Config);

        await SynchronizeAsync(userServiceId, cancellationToken);
        var integration = await integrations.GetByUserServiceIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("Integration not found.");

        try
        {
            await workflowClient.ActivateWorkflowAsync(integration.WorkflowId!, cancellationToken);
            await integrations.UpdateWorkflowStateAsync(
                integration.IntegrationId,
                IntegrationStatuses.Live,
                null,
                callerUserId,
                DateTime.UtcNow,
                null,
                null,
                null,
                BuildNodeMappingsJson(context.Config, integration.NodeMappingsJson));
        }
        catch (Exception ex)
        {
            await integrations.UpdateWorkflowStateAsync(
                integration.IntegrationId,
                IntegrationStatuses.Failed,
                ex.Message,
                integration.PublishedBy,
                integration.PublishedDate,
                integration.PausedBy,
                integration.PausedDate,
                null,
                BuildNodeMappingsJson(context.Config, integration.NodeMappingsJson));
            throw new InvalidOperationException($"Integration publish failed: {ex.Message}");
        }

        integration = await integrations.GetByUserServiceIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("Integration not found.");
        return ToSummary(integration);
    }

    public async Task<IntegrationSummaryDto> PauseAsync(int userServiceId, int callerUserId, CancellationToken cancellationToken = default)
    {
        var lockName = $"integration:{userServiceId}:pause";
        await using var integrationLock = await AcquireLockAsync(lockName, cancellationToken);
        var integration = await integrations.GetByUserServiceIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("Integration not found.");
        if (string.IsNullOrWhiteSpace(integration.WorkflowId))
            throw new InvalidOperationException("Integration workflow has not been provisioned.");

        try
        {
            await workflowClient.DeactivateWorkflowAsync(integration.WorkflowId, cancellationToken);
            await integrations.UpdateWorkflowStateAsync(
                integration.IntegrationId,
                IntegrationStatuses.Paused,
                null,
                integration.PublishedBy,
                integration.PublishedDate,
                callerUserId,
                DateTime.UtcNow,
                null,
                integration.NodeMappingsJson);
        }
        catch (Exception ex)
        {
            await integrations.UpdateWorkflowStateAsync(
                integration.IntegrationId,
                IntegrationStatuses.Failed,
                ex.Message,
                integration.PublishedBy,
                integration.PublishedDate,
                integration.PausedBy,
                integration.PausedDate,
                null,
                integration.NodeMappingsJson);
            throw new InvalidOperationException($"Integration pause failed: {ex.Message}");
        }

        integration = await integrations.GetByUserServiceIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("Integration not found.");
        return ToSummary(integration);
    }

    public async Task<IntegrationSummaryDto> StartAsync(int userServiceId, int callerUserId, CancellationToken cancellationToken = default)
    {
        var lockName = $"integration:{userServiceId}:start";
        await using var integrationLock = await AcquireLockAsync(lockName, cancellationToken);
        var integration = await integrations.GetByUserServiceIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("Integration not found.");
        if (string.IsNullOrWhiteSpace(integration.WorkflowId))
            throw new InvalidOperationException("Integration workflow has not been provisioned.");

        try
        {
            await workflowClient.ActivateWorkflowAsync(integration.WorkflowId, cancellationToken);
            await integrations.UpdateWorkflowStateAsync(
                integration.IntegrationId,
                IntegrationStatuses.Live,
                null,
                callerUserId,
                integration.PublishedDate ?? DateTime.UtcNow,
                null,
                null,
                null,
                integration.NodeMappingsJson);
        }
        catch (Exception ex)
        {
            await integrations.UpdateWorkflowStateAsync(
                integration.IntegrationId,
                IntegrationStatuses.Failed,
                ex.Message,
                integration.PublishedBy,
                integration.PublishedDate,
                integration.PausedBy,
                integration.PausedDate,
                null,
                integration.NodeMappingsJson);
            throw new InvalidOperationException($"Integration start failed: {ex.Message}");
        }

        integration = await integrations.GetByUserServiceIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("Integration not found.");
        return ToSummary(integration);
    }

    private static string BuildWorkflowName(UserServiceIntegrationContextDto context) =>
        $"{context.CompanyName} | {context.ServiceName}";

    private static IntegrationSummaryDto ToSummary(Integration integration) => new()
    {
        WorkflowName = integration.WorkflowName,
        Status = integration.Status,
        LastError = integration.LastError,
        PublishedDate = integration.PublishedDate,
        PausedDate = integration.PausedDate
    };

    private static void ValidatePublishable(string? configJson)
    {
        var config = ParseConfig(configJson);
        var triggerCount = CountArray(config, "trigger");
        var actionCount = CountArray(config, "action");
        var outputCount = CountArray(config, "output");

        if (triggerCount == 0 || actionCount == 0 || outputCount == 0)
            throw new ArgumentException("Trigger, Action, and Output selections must all be confirmed before publishing.");
    }

    private static int CountArray(JsonObject config, string key) =>
        config[key] is JsonArray arr ? arr.Count : 0;

    private static N8nWorkflowDocument BuildWorkflow(string workflowName, string? configJson, string? existingNodeMappingsJson)
    {
        var config = ParseConfig(configJson);
        var mappings = ParseNodeMappings(existingNodeMappingsJson);
        var nodes = new List<object>
        {
            new
            {
                id = "start-node",
                name = "Start",
                type = "n8n-nodes-base.scheduleTrigger",
                typeVersion = 1,
                position = new[] { 200, 300 },
                parameters = new
                {
                    rule = new
                    {
                        interval = new[] { new { field = "minutes", minutesInterval = 15 } }
                    }
                }
            }
        };
        var connections = new Dictionary<string, object[]>();
        var orderedKeys = new[] { "trigger", "action", "output" };
        var previousNodeName = "Start";
        var positionX = 460;
        var positionY = 180;

        foreach (var category in orderedKeys)
        {
            if (config[category] is not JsonArray values) continue;
            foreach (var value in values.Select(node => node?.GetValue<string>()).Where(value => !string.IsNullOrWhiteSpace(value)))
            {
                var nodeName = value!.Trim();
                var mappingKey = $"{category}:{nodeName}".ToLowerInvariant();
                if (!mappings.TryGetValue(mappingKey, out var nodeId))
                {
                    nodeId = Guid.NewGuid().ToString("N");
                    mappings[mappingKey] = nodeId;
                }

                nodes.Add(new
                {
                    id = nodeId,
                    name = $"{category.ToUpperInvariant()}: {nodeName}",
                    type = "n8n-nodes-base.set",
                    typeVersion = 3,
                    position = new[] { positionX, positionY },
                    parameters = new
                    {
                        keepOnlySet = false,
                        values = new
                        {
                            @string = new[]
                            {
                                new { name = "category", value = category },
                                new { name = "name", value = nodeName }
                            }
                        }
                    }
                });

                connections[previousNodeName] =
                [
                    new
                    {
                        node = $"{category.ToUpperInvariant()}: {nodeName}",
                        type = "main",
                        index = 0
                    }
                ];
                previousNodeName = $"{category.ToUpperInvariant()}: {nodeName}";
                positionX += 240;
                if (category == "action") positionY += 120;
            }
        }

        return new N8nWorkflowDocument
        {
            Name = workflowName,
            Active = false,
            Nodes = nodes.ToArray(),
            Connections = connections,
            Settings = new Dictionary<string, object?>()
        };
    }

    private static Dictionary<string, string> ParseNodeMappings(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return [];
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(raw) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static string BuildNodeMappingsJson(string? configJson, string? existingNodeMappingsJson)
    {
        var config = ParseConfig(configJson);
        var mapping = ParseNodeMappings(existingNodeMappingsJson);
        foreach (var key in new[] { "trigger", "action", "output" })
        {
            if (config[key] is not JsonArray values) continue;
            foreach (var value in values.Select(node => node?.GetValue<string>()).Where(value => !string.IsNullOrWhiteSpace(value)))
            {
                var mappingKey = $"{key}:{value!.Trim()}";
                if (!mapping.ContainsKey(mappingKey))
                    mapping[mappingKey] = Guid.NewGuid().ToString("N");
            }
        }
        return JsonSerializer.Serialize(mapping);
    }

    private static JsonObject ParseConfig(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return [];
        try
        {
            return JsonNode.Parse(raw) as JsonObject ?? [];
        }
        catch
        {
            return [];
        }
    }

    private async Task<IntegrationLock> AcquireLockAsync(string lockName, CancellationToken cancellationToken)
    {
        var conn = db.GetConnection();
        await conn.OpenAsync(cancellationToken);
        var acquired = await conn.ExecuteScalarAsync<long>("SELECT GET_LOCK(@lockName, 1)", new { lockName });
        if (acquired != 1)
        {
            await conn.DisposeAsync();
            throw new InvalidOperationException("An integration operation is already in progress. Refresh and try again.");
        }

        return new IntegrationLock(conn, lockName);
    }

    private sealed class IntegrationLock(MySqlConnector.MySqlConnection connection, string lockName) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            try
            {
                await connection.ExecuteAsync("SELECT RELEASE_LOCK(@lockName)", new { lockName });
            }
            finally
            {
                await connection.DisposeAsync();
            }
        }
    }
}
