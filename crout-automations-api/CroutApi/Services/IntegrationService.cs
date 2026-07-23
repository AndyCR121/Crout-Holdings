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
    N8nTemplateWorkflowService templates,
    IIntegrationDefinitionRepository integrationDefinitions,
    IUserServiceCredentialRepository credentials,
    DbHelper db) : IIntegrationService
{
    public async Task<IntegrationSummaryDto> EnsureProvisionedAsync(int userServiceId, CancellationToken cancellationToken = default)
    {
        await using var integrationLock = await AcquireLockAsync($"integration:{userServiceId}:provision", cancellationToken);
        var context = await userServices.GetIntegrationContextAsync(userServiceId)
            ?? throw new KeyNotFoundException("Client service not found.");
        var integration = await EnsurePlaceholderAsync(context);

        if (!string.IsNullOrWhiteSpace(integration.WorkflowId))
            return await SynchronizeExistingWorkflowAsync(integration, context, cancellationToken);

        return await ProvisionFromTemplateAsync(integration, context, cancellationToken);
    }

    private async Task<IntegrationSummaryDto> ProvisionFromTemplateAsync(Integration integration, UserServiceIntegrationContextDto context, CancellationToken cancellationToken)
    {
        var template = await templates.ResolveAsync(integration, context, cancellationToken);
        var clonedWorkflow = templates.Clone(template, integration, context);
        var createdWorkflow = await workflowClient.CreateWorkflowAsync(clonedWorkflow.Name, clonedWorkflow, cancellationToken);
        if (string.IsNullOrWhiteSpace(createdWorkflow.Id))
            throw new InvalidOperationException("n8n did not return an ID for the created workflow.");
        await workflowClient.UpdateWorkflowTagsAsync(createdWorkflow.Id, clonedWorkflow.Tags, cancellationToken);

        await integrations.UpdateProvisioningAsync(
            integration.IntegrationId,
            createdWorkflow.Id,
            JsonSerializer.Serialize(createdWorkflow),
            integration.NodeMappingsJson,
            template.WorkflowId,
            template.ServiceTag,
            template.Version,
            template.SnapshotHash,
            template.ResolvedAt);

        return ToSummary(await ReloadAsync(context.UserServiceId));
    }

    public async Task<IntegrationSummaryDto> SynchronizeAsync(int userServiceId, CancellationToken cancellationToken = default)
    {
        await using var integrationLock = await AcquireLockAsync($"integration:{userServiceId}:sync", cancellationToken);
        var context = await userServices.GetIntegrationContextAsync(userServiceId)
            ?? throw new KeyNotFoundException("Client service not found.");
        var integration = await EnsurePlaceholderAsync(context);
        if (string.IsNullOrWhiteSpace(integration.WorkflowId))
            return await EnsureProvisionedAsync(userServiceId, cancellationToken);
        return await SynchronizeExistingWorkflowAsync(integration, context, cancellationToken);
    }

    public async Task<IntegrationStatusDto> GetStatusAsync(int userServiceId, CancellationToken cancellationToken = default)
    {
        var integration = await integrations.GetByUserServiceIdAsync(userServiceId);
        if (integration is null)
            return new IntegrationStatusDto { UserServiceId = userServiceId, LifecycleStatus = "PendingConfirmation", Message = "Integration has not been provisioned." };

        var result = new IntegrationStatusDto
        {
            UserServiceId = userServiceId,
            LifecycleStatus = integration.Status,
            CredentialStatus = await GetCredentialStatusAsync(userServiceId),
            WorkflowId = integration.WorkflowId,
            WorkflowExists = !string.IsNullOrWhiteSpace(integration.WorkflowId)
        };
        if (string.IsNullOrWhiteSpace(integration.WorkflowId)) return result;

        try
        {
            var remote = await workflowClient.GetWorkflowAsync(integration.WorkflowId, cancellationToken);
            if (remote is null)
            {
                result.WorkflowExists = false;
                result.PublicationStatus = "Missing";
                result.StatusSource = "N8n";
                result.HasMismatch = true;
                result.Message = "The n8n workflow no longer exists and was not recreated automatically.";
                return result;
            }

            var context = await userServices.GetIntegrationContextAsync(userServiceId) ?? throw new KeyNotFoundException("Client service not found.");
            result.StatusSource = "N8n";
            result.WorkflowActive = remote.Active;
            result.PublicationStatus = remote.Active ? "Published" : "Unpublished";
            result.ExpectedTagsPresent = N8nTemplateWorkflowService.HasExpectedClientTags(remote, context);
            result.HasMismatch = (!result.ExpectedTagsPresent.Value)
                || !N8nTemplateWorkflowService.HasManagedNotesNode(remote)
                || (remote.Active && integration.Status != IntegrationStatuses.Live);
            return result;
        }
        catch (Exception)
        {
            result.StatusSource = "DatabaseFallback";
            result.PublicationStatus = "Unknown";
            result.Message = "n8n is currently unavailable; the database lifecycle status is shown.";
            return result;
        }
    }

    public async Task<IntegrationSummaryDto> PublishAsync(int userServiceId, int callerUserId, CancellationToken cancellationToken = default)
    {
        await using var integrationLock = await AcquireLockAsync($"integration:{userServiceId}:publish", cancellationToken);
        var context = await userServices.GetIntegrationContextAsync(userServiceId)
            ?? throw new KeyNotFoundException("Client service not found.");
        ValidatePublishable(context.Config);
        await EnsureProvisionedAsync(userServiceId, cancellationToken);
        var current = await integrations.GetByUserServiceIdAsync(userServiceId) ?? throw new KeyNotFoundException("Integration not found.");

        try
        {
            await ValidatePublicationPreflightAsync(current, context, cancellationToken);
            await workflowClient.ActivateWorkflowAsync(current.WorkflowId!, cancellationToken);
            var verified = await workflowClient.GetWorkflowAsync(current.WorkflowId!, cancellationToken);
            if (verified is not { Active: true }) throw new InvalidOperationException("n8n did not confirm workflow activation.");
            await integrations.UpdateWorkflowStateAsync(current.IntegrationId, IntegrationStatuses.Live, null, callerUserId, DateTime.UtcNow, null, null, null, current.NodeMappingsJson);
        }
        catch (Exception ex)
        {
            await integrations.UpdateWorkflowStateAsync(current.IntegrationId, IntegrationStatuses.Failed, Redact(ex), current.PublishedBy, current.PublishedDate, current.PausedBy, current.PausedDate, null, current.NodeMappingsJson);
            throw new InvalidOperationException("Integration publish failed. Review the integration status and retry.");
        }

        return ToSummary(await ReloadAsync(userServiceId));
    }

    public async Task<IntegrationSummaryDto> PauseAsync(int userServiceId, int callerUserId, CancellationToken cancellationToken = default)
    {
        await using var integrationLock = await AcquireLockAsync($"integration:{userServiceId}:pause", cancellationToken);
        var integration = await RequireWorkflowAsync(userServiceId);
        try
        {
            await workflowClient.DeactivateWorkflowAsync(integration.WorkflowId!, cancellationToken);
            var verified = await workflowClient.GetWorkflowAsync(integration.WorkflowId!, cancellationToken);
            if (verified is not { Active: false }) throw new InvalidOperationException("n8n did not confirm workflow deactivation.");
            await integrations.UpdateWorkflowStateAsync(integration.IntegrationId, IntegrationStatuses.Paused, null, integration.PublishedBy, integration.PublishedDate, callerUserId, DateTime.UtcNow, null, integration.NodeMappingsJson);
        }
        catch (Exception ex)
        {
            await integrations.UpdateWorkflowStateAsync(integration.IntegrationId, IntegrationStatuses.Failed, Redact(ex), integration.PublishedBy, integration.PublishedDate, integration.PausedBy, integration.PausedDate, null, integration.NodeMappingsJson);
            throw new InvalidOperationException("Integration pause failed. Review the integration status and retry.");
        }
        return ToSummary(await ReloadAsync(userServiceId));
    }

    public async Task<IntegrationSummaryDto> StartAsync(int userServiceId, int callerUserId, CancellationToken cancellationToken = default)
    {
        await using var integrationLock = await AcquireLockAsync($"integration:{userServiceId}:start", cancellationToken);
        var integration = await RequireWorkflowAsync(userServiceId);
        try
        {
            await workflowClient.ActivateWorkflowAsync(integration.WorkflowId!, cancellationToken);
            var verified = await workflowClient.GetWorkflowAsync(integration.WorkflowId!, cancellationToken);
            if (verified is not { Active: true }) throw new InvalidOperationException("n8n did not confirm workflow activation.");
            await integrations.UpdateWorkflowStateAsync(integration.IntegrationId, IntegrationStatuses.Live, null, callerUserId, integration.PublishedDate ?? DateTime.UtcNow, null, null, null, integration.NodeMappingsJson);
        }
        catch (Exception ex)
        {
            await integrations.UpdateWorkflowStateAsync(integration.IntegrationId, IntegrationStatuses.Failed, Redact(ex), integration.PublishedBy, integration.PublishedDate, integration.PausedBy, integration.PausedDate, null, integration.NodeMappingsJson);
            throw new InvalidOperationException("Integration start failed. Review the integration status and retry.");
        }
        return ToSummary(await ReloadAsync(userServiceId));
    }

    private async Task<IntegrationSummaryDto> SynchronizeExistingWorkflowAsync(Integration integration, UserServiceIntegrationContextDto context, CancellationToken cancellationToken)
    {
        var remote = await workflowClient.GetWorkflowAsync(integration.WorkflowId!, cancellationToken);
        if (remote is null)
        {
            if (string.Equals(integration.Status, IntegrationStatuses.Development, StringComparison.OrdinalIgnoreCase))
                return await ProvisionFromTemplateAsync(integration, context, cancellationToken);

            throw new InvalidOperationException("The provisioned n8n workflow no longer exists. Re-provision it from an approved template before continuing.");
        }

        templates.SynchronizeManagedContent(remote, context);
        var updated = await workflowClient.UpdateWorkflowAsync(integration.WorkflowId!, remote, cancellationToken);
        await workflowClient.UpdateWorkflowTagsAsync(integration.WorkflowId!, remote.Tags, cancellationToken);
        await integrations.UpdateWorkflowStateAsync(integration.IntegrationId, integration.Status, null, integration.PublishedBy, integration.PublishedDate, integration.PausedBy, integration.PausedDate, JsonSerializer.Serialize(updated), integration.NodeMappingsJson);
        return ToSummary(await ReloadAsync(context.UserServiceId));
    }

    private async Task<Integration> EnsurePlaceholderAsync(UserServiceIntegrationContextDto context)
    {
        var existing = await integrations.GetByUserServiceIdAsync(context.UserServiceId);
        if (existing is not null) return existing;
        var created = await integrations.TryCreatePlaceholderAsync(new Integration
        {
            UserServiceId = context.UserServiceId,
            CompanyId = context.CompanyId,
            WorkflowName = $"{context.CompanyName} | {context.ServiceName}",
            Status = IntegrationStatuses.Development
        });
        return await integrations.GetByUserServiceIdAsync(context.UserServiceId)
            ?? throw new InvalidOperationException(created ? "Integration placeholder could not be reloaded." : "Integration placeholder could not be created.");
    }

    private async Task<Integration> RequireWorkflowAsync(int userServiceId)
    {
        var integration = await integrations.GetByUserServiceIdAsync(userServiceId) ?? throw new KeyNotFoundException("Integration not found.");
        if (string.IsNullOrWhiteSpace(integration.WorkflowId)) throw new InvalidOperationException("Integration workflow has not been provisioned.");
        return integration;
    }

    private async Task<Integration> ReloadAsync(int userServiceId) =>
        await integrations.GetByUserServiceIdAsync(userServiceId) ?? throw new KeyNotFoundException("Integration not found.");

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
        var config = string.IsNullOrWhiteSpace(configJson) ? [] : JsonNode.Parse(configJson) as JsonObject ?? [];
        if (config["trigger"] is not JsonArray { Count: > 0 } || config["action"] is not JsonArray { Count: > 0 } || config["output"] is not JsonArray { Count: > 0 })
            throw new ArgumentException("Trigger, Action, and Output selections must all be confirmed before publishing.");
    }

    private async Task ValidatePublicationPreflightAsync(Integration integration, UserServiceIntegrationContextDto context, CancellationToken cancellationToken)
    {
        var remote = await workflowClient.GetWorkflowAsync(integration.WorkflowId!, cancellationToken)
            ?? throw new InvalidOperationException("The n8n workflow no longer exists.");
        if (!N8nTemplateWorkflowService.HasExpectedClientTags(remote, context))
            throw new InvalidOperationException("The workflow is missing required Crout-managed tags.");
        if (!N8nTemplateWorkflowService.HasManagedNotesNode(remote))
            throw new InvalidOperationException("The workflow is missing the required Crout-managed Notes node.");
        if (await GetCredentialStatusAsync(context.UserServiceId) is not "NotRequired" and not "Configured")
            throw new InvalidOperationException("Required integration credentials are incomplete.");
    }

    private async Task<string> GetCredentialStatusAsync(int userServiceId)
    {
        var context = await userServices.GetIntegrationContextAsync(userServiceId);
        if (context is null) return "Unknown";
        var configuredNames = GetConfirmedIntegrationNames(context.Config);
        if (configuredNames.Count == 0) return "NotRequired";
        var definitions = (await integrationDefinitions.GetAllAsync(activeOnly: true))
            .Where(definition => definition.HasCredentials && configuredNames.Contains(definition.Name))
            .ToArray();
        if (definitions.Length == 0) return "NotRequired";
        var stored = await credentials.GetByUserServiceIdAsync(userServiceId);
        var configured = definitions.Count(definition => stored.Any(value => value.IntegrationDefinitionId == definition.Id && value.Status == "Configured"));
        return configured == definitions.Length ? "Configured" : configured == 0 ? "Missing" : "PartiallyConfigured";
    }

    private static HashSet<string> GetConfirmedIntegrationNames(string? configJson)
    {
        if (string.IsNullOrWhiteSpace(configJson)) return new(StringComparer.OrdinalIgnoreCase);
        try
        {
            var config = JsonNode.Parse(configJson) as JsonObject;
            return (config?["confirmedAddons"] as JsonArray ?? [])
                .OfType<JsonObject>()
                .SelectMany(addon => (addon["integrations"] as JsonArray ?? []).OfType<JsonObject>())
                .Select(integration => integration["integrationName"]?.GetValue<string>())
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Select(name => name!)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }
        catch (JsonException)
        {
            return new(StringComparer.OrdinalIgnoreCase);
        }
    }

    private static string Redact(Exception exception) => exception.GetType().Name;

    private async Task<IntegrationLock> AcquireLockAsync(string lockName, CancellationToken cancellationToken)
    {
        var conn = db.GetConnection();
        await conn.OpenAsync(cancellationToken);
        if (await conn.ExecuteScalarAsync<long>("SELECT GET_LOCK(@lockName, 1)", new { lockName }) != 1)
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
            try { await connection.ExecuteAsync("SELECT RELEASE_LOCK(@lockName)", new { lockName }); }
            finally { await connection.DisposeAsync(); }
        }
    }
}
