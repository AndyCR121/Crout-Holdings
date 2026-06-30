using System.Text.Json;
using CroutApi.DTOs;
using CroutApi.Models;
using CroutApi.Repositories;

namespace CroutApi.Services;

public class DevUserServiceFormService(
    IServiceTriggerRepository triggers,
    IUserServiceRepository userServices,
    IIntegrationRepository integrations) : IDevUserServiceFormService
{
    private static readonly HashSet<string> AllowedElementTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "input", "select", "datetime", "checkbox", "header", "paragraph", "divider", "tabs"
    };

    private static readonly HashSet<string> FieldElementTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "input", "select", "datetime", "checkbox"
    };

    private static readonly HashSet<string> AllowedResponseModes = new(StringComparer.OrdinalIgnoreCase)
    {
        "toast", "modal", "inline", "download"
    };

    public async Task<DevUserServiceFormDto?> GetAsync(int developerUserId, int userServiceId)
    {
        var context = await GetAssignedContextAsync(developerUserId, userServiceId);
        var integration = context.IntegrationId is int integrationId
            ? await integrations.GetByIntegrationIdAsync(integrationId)
            : null;

        if (integration is null || string.IsNullOrWhiteSpace(integration.CustomFormDraftSchemaJson))
            return null;

        return ToDto(integration);
    }

    public async Task<DevUserServiceFormDto> CreateAsync(int developerUserId, int userServiceId, UpsertDevUserServiceFormDto dto)
    {
        var context = await GetAssignedContextAsync(developerUserId, userServiceId);
        return await UpsertAsync(context, dto);
    }

    public async Task<DevUserServiceFormDto> UpdateAsync(int developerUserId, int userServiceId, UpsertDevUserServiceFormDto dto)
    {
        var context = await GetAssignedContextAsync(developerUserId, userServiceId);
        var integration = await RequireIntegrationAsync(context);
        if (string.IsNullOrWhiteSpace(integration.CustomFormDraftSchemaJson))
            throw new KeyNotFoundException("No custom form has been created for this service yet.");

        return await UpsertAsync(context, dto, integration);
    }

    public async Task DeleteAsync(int developerUserId, int userServiceId)
    {
        var context = await GetAssignedContextAsync(developerUserId, userServiceId);
        var integration = await RequireIntegrationAsync(context);
        if (string.IsNullOrWhiteSpace(integration.CustomFormDraftSchemaJson))
            throw new KeyNotFoundException("No custom form was found for this service.");

        await integrations.DeleteCustomFormAsync(integration.IntegrationId);
    }

    private async Task<DevUserServiceFormDto> UpsertAsync(
        DeveloperAssignedFormContext context,
        UpsertDevUserServiceFormDto dto,
        Integration? existing = null)
    {
        Validate(dto);

        var integration = existing ?? await RequireIntegrationAsync(context);
        var normalizedResponseMode = NormalizeResponseMode(dto.ResponseMode);
        var payloadTemplate = ClonePayloadTemplate(dto.PayloadTemplate);
        var schema = dto.Schema.Clone();
        var envelope = BuildEnvelope(dto, normalizedResponseMode, payloadTemplate, schema);
        var schemaJson = JsonSerializer.Serialize(envelope);

        await integrations.SaveCustomFormDraftAsync(
            integration.IntegrationId,
            dto.Label!.Trim(),
            integration.CustomFormWebhookUrl ?? context.WebhookUrl ?? string.Empty,
            schemaJson);

        var reloaded = await integrations.GetByIntegrationIdAsync(integration.IntegrationId)
            ?? throw new InvalidOperationException("Custom form could not be reloaded after save.");

        return ToDto(reloaded);
    }

    private async Task<DeveloperAssignedFormContext> GetAssignedContextAsync(int developerUserId, int userServiceId)
    {
        var context = await triggers.GetDeveloperAssignedFormContextAsync(developerUserId, userServiceId);
        if (context is not null) return context;

        var userService = await userServices.GetByIdAsync(userServiceId);
        if (userService is { Active: true })
            throw new UnauthorizedAccessException("You are not assigned to this service.");

        throw new KeyNotFoundException("Assigned service was not found.");
    }

    private async Task<Integration> RequireIntegrationAsync(DeveloperAssignedFormContext context)
    {
        if (context.IntegrationId is not int integrationId)
            throw new KeyNotFoundException("Integration was not found for this service.");

        return await integrations.GetByIntegrationIdAsync(integrationId)
            ?? throw new KeyNotFoundException("Integration was not found for this service.");
    }

    private static void Validate(UpsertDevUserServiceFormDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Label))
            throw new ArgumentException("Form label is required.");

        var responseMode = NormalizeResponseMode(dto.ResponseMode);
        if (!AllowedResponseModes.Contains(responseMode))
            throw new ArgumentException("Response mode is invalid.");

        if (dto.PayloadTemplate is { } payloadTemplate && payloadTemplate.ValueKind == JsonValueKind.Undefined)
            throw new ArgumentException("Payload template must contain valid JSON.");

        if (dto.Schema.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            throw new ArgumentException("Form schema is required.");

        if (dto.Schema.ValueKind != JsonValueKind.Object)
            throw new ArgumentException("Form schema must be a JSON object.");

        if (!dto.Schema.TryGetProperty("elements", out var elements) || elements.ValueKind != JsonValueKind.Array)
            throw new ArgumentException("Form schema must include an elements array.");

        var fieldKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var knownTabIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var pendingTabReferences = new List<string>();
        var tabsElementCount = 0;
        var elementCount = 0;

        foreach (var element in elements.EnumerateArray())
        {
            elementCount++;
            if (elementCount > 100)
                throw new ArgumentException("A custom form can contain a maximum of 100 elements.");

            if (element.ValueKind != JsonValueKind.Object)
                throw new ArgumentException("Every form element must be a JSON object.");

            var elementType = GetRequiredString(element, "type", "Each element requires a type.");
            if (!AllowedElementTypes.Contains(elementType))
                throw new ArgumentException($"Element type '{elementType}' is not supported.");

            _ = GetRequiredString(element, "id", "Each element requires an id.");

            if (FieldElementTypes.Contains(elementType))
            {
                var key = GetRequiredString(element, "key", $"Field element '{elementType}' requires a key.");
                if (!fieldKeys.Add(key))
                    throw new ArgumentException($"Field key '{key}' must be unique within the form.");

                var isHidden = GetOptionalBoolean(element, "hidden");
                var label = GetOptionalString(element, "label");
                if (!isHidden && string.IsNullOrWhiteSpace(label))
                    throw new ArgumentException($"Field '{key}' requires a label.");
            }

            if (elementType.Equals("tabs", StringComparison.OrdinalIgnoreCase))
            {
                tabsElementCount++;
                if (tabsElementCount > 1)
                    throw new ArgumentException("Only one tabs element is supported in a form.");

                if (!element.TryGetProperty("tabs", out var tabs) || tabs.ValueKind != JsonValueKind.Array || tabs.GetArrayLength() == 0)
                    throw new ArgumentException("Tabs elements must include at least one tab.");

                foreach (var tab in tabs.EnumerateArray())
                {
                    if (tab.ValueKind != JsonValueKind.Object)
                        throw new ArgumentException("Each tab must be a JSON object.");

                    var tabId = GetRequiredString(tab, "id", "Each tab requires an id.");
                    var tabLabel = GetRequiredString(tab, "label", "Each tab requires a label.");
                    if (!knownTabIds.Add(tabId))
                        throw new ArgumentException($"Tab id '{tabId}' must be unique.");
                    if (string.IsNullOrWhiteSpace(tabLabel))
                        throw new ArgumentException("Tabs cannot have empty labels.");
                }
            }

            var tabIdRef = GetOptionalString(element, "tabId");
            if (!string.IsNullOrWhiteSpace(tabIdRef))
                pendingTabReferences.Add(tabIdRef);
        }

        if (tabsElementCount == 0 && pendingTabReferences.Count > 0)
            throw new ArgumentException("Elements cannot be assigned to tabs before a tabs element exists.");

        foreach (var tabId in pendingTabReferences)
        {
            if (!knownTabIds.Contains(tabId))
                throw new ArgumentException($"Element references unknown tab '{tabId}'.");
        }
    }

    private static object BuildEnvelope(
        UpsertDevUserServiceFormDto dto,
        string normalizedResponseMode,
        JsonElement payloadTemplate,
        JsonElement schema)
    {
        return new
        {
            schemaVersion = 2,
            label = dto.Label!.Trim(),
            description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            responseMode = normalizedResponseMode,
            payloadTemplate,
            schema
        };
    }

    private static DevUserServiceFormDto ToDto(Integration integration)
    {
        using var document = JsonDocument.Parse(integration.CustomFormDraftSchemaJson!);
        var root = document.RootElement;
        var payloadTemplate = root.TryGetProperty("payloadTemplate", out var payload)
            ? payload.Clone()
            : JsonDocument.Parse("{}").RootElement.Clone();
        var schema = root.TryGetProperty("schema", out var schemaElement)
            ? schemaElement.Clone()
            : JsonDocument.Parse("{\"elements\":[]}").RootElement.Clone();

        return new DevUserServiceFormDto
        {
            FormId = integration.IntegrationId,
            UserServiceId = integration.UserServiceId,
            Label = root.TryGetProperty("label", out var label) ? label.GetString() ?? integration.CustomFormTitle ?? string.Empty : integration.CustomFormTitle ?? string.Empty,
            Description = root.TryGetProperty("description", out var description) ? description.GetString() : null,
            ResponseMode = root.TryGetProperty("responseMode", out var responseMode) ? NormalizeResponseMode(responseMode.GetString()) : "inline",
            PayloadTemplate = payloadTemplate,
            Schema = schema,
            SchemaVersion = root.TryGetProperty("schemaVersion", out var schemaVersion) && schemaVersion.TryGetInt32(out var parsedVersion) ? parsedVersion : 2,
            UpdatedAtUtc = integration.UpdatedAt
        };
    }

    private static string NormalizeResponseMode(string? responseMode) =>
        string.IsNullOrWhiteSpace(responseMode) ? "inline" : responseMode.Trim().ToLowerInvariant();

    private static JsonElement ClonePayloadTemplate(JsonElement? payloadTemplate)
    {
        if (payloadTemplate is null || payloadTemplate.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            return JsonDocument.Parse("{}").RootElement.Clone();

        return payloadTemplate.Value.Clone();
    }

    private static string GetRequiredString(JsonElement element, string propertyName, string errorMessage)
    {
        if (!element.TryGetProperty(propertyName, out var value) || value.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(value.GetString()))
            throw new ArgumentException(errorMessage);
        return value.GetString()!.Trim();
    }

    private static string? GetOptionalString(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var value)) return null;
        return value.ValueKind == JsonValueKind.String ? value.GetString()?.Trim() : null;
    }

    private static bool GetOptionalBoolean(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var value)) return false;
        return value.ValueKind == JsonValueKind.True;
    }
}
