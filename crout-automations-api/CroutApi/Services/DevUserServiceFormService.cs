using System.Text.Json;
using CroutApi.DTOs;
using CroutApi.Repositories;
using System.Text.Json.Nodes;

namespace CroutApi.Services;

public class DevUserServiceFormService(
    IIntegrationRepository integrations,
    IUserServiceRepository userServices,
    IIntegrationService integrationService) : IDevUserServiceFormService
{
    public async Task<DevUserServiceFormDto?> GetAsync(int developerUserId, int userServiceId)
    {
        var context = await RequireDeveloperAccessAsync(developerUserId, userServiceId);
        return ToDto(context);
    }

    public async Task<DevUserServiceFormDto> CreateAsync(int developerUserId, int userServiceId, UpsertDevUserServiceFormDto dto)
    {
        return await UpsertAsync(developerUserId, userServiceId, dto);
    }

    public async Task<DevUserServiceFormDto> UpdateAsync(int developerUserId, int userServiceId, UpsertDevUserServiceFormDto dto)
    {
        return await UpsertAsync(developerUserId, userServiceId, dto);
    }

    public async Task DeleteAsync(int developerUserId, int userServiceId)
    {
        var context = await RequireDeveloperAccessAsync(developerUserId, userServiceId);
        await integrations.DeleteCustomFormAsync(context.IntegrationId);
    }

    private async Task<DevUserServiceFormDto> UpsertAsync(int developerUserId, int userServiceId, UpsertDevUserServiceFormDto dto)
    {
        ValidateFormDto(dto);

        var context = await RequireDeveloperAccessAsync(developerUserId, userServiceId);
        var userService = await userServices.GetByIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("User service not found.");
        if (!HasConfirmedCustomFormTrigger(userService.Config))
            throw new ArgumentException("A confirmed WebsiteForm or custom-form trigger is required before building a custom form.");

        var webhookUrl = string.IsNullOrWhiteSpace(dto.ProductionWebhookUrl)
            ? ExtractWebhookUrl(dto.Schema)
            : dto.ProductionWebhookUrl.Trim();
        if (string.IsNullOrWhiteSpace(webhookUrl))
            throw new ArgumentException("A production webhook URL is required.");
        if (!Uri.TryCreate(webhookUrl, UriKind.Absolute, out _))
            throw new ArgumentException("Webhook URL must be absolute.");

        var envelope = JsonSerializer.Serialize(new
        {
            schemaVersion = 2,
            label = dto.Label!.Trim(),
            description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            responseMode = NormalizeResponseMode(dto.ResponseMode),
            payloadTemplate = dto.PayloadTemplate?.Clone() ?? JsonDocument.Parse("{}").RootElement.Clone(),
            schema = dto.Schema.Clone()
        });

        await integrations.SaveCustomFormDraftAsync(context.IntegrationId, dto.Label!.Trim(), webhookUrl, envelope);
        var updated = await integrations.GetCustomFormContextByUserServiceIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("Custom form could not be reloaded.");
        return ToDto(updated) ?? throw new InvalidOperationException("Custom form could not be mapped.");
    }

    private async Task<CustomFormAccessContextDto> RequireDeveloperAccessAsync(int developerUserId, int userServiceId)
    {
        await integrationService.EnsureProvisionedAsync(userServiceId);
        var context = await integrations.GetCustomFormContextByUserServiceIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("User service not found.");
        if (!context.UserServiceActive)
            throw new ArgumentException("User service is inactive.");
        if (context.AssignedDeveloperUserId != developerUserId)
            throw new UnauthorizedAccessException("You do not have access to this user service.");
        return context;
    }

    private static DevUserServiceFormDto? ToDto(CustomFormAccessContextDto? context)
    {
        if (context is null) return null;

        var schemaJson = !string.IsNullOrWhiteSpace(context.PublishedSchemaJson)
            ? context.PublishedSchemaJson
            : context.DraftSchemaJson;
        if (string.IsNullOrWhiteSpace(schemaJson)) return null;

        using var document = JsonDocument.Parse(schemaJson);
        var root = document.RootElement;
        return new DevUserServiceFormDto
        {
            FormId = context.IntegrationId,
            UserServiceId = context.UserServiceId,
            Label = root.TryGetProperty("label", out var label)
                ? label.GetString() ?? context.Title ?? string.Empty
                : context.Title ?? string.Empty,
            Description = root.TryGetProperty("description", out var description) ? description.GetString() : null,
            ResponseMode = root.TryGetProperty("responseMode", out var responseMode)
                ? NormalizeResponseMode(responseMode.GetString())
                : "inline",
            PayloadTemplate = root.TryGetProperty("payloadTemplate", out var payload)
                ? payload.Clone()
                : JsonDocument.Parse("{\"source\":\"custom-form\"}").RootElement.Clone(),
            Schema = root.TryGetProperty("schema", out var schema)
                ? schema.Clone()
                : JsonDocument.Parse("{\"elements\":[]}").RootElement.Clone(),
            SchemaVersion = root.TryGetProperty("schemaVersion", out var version) && version.TryGetInt32(out var parsedVersion) ? parsedVersion : 2,
            ProductionWebhookUrl = context.WebhookUrl,
            UpdatedAtUtc = context.PublishedAtUtc ?? DateTime.UtcNow
        };
    }

    private static bool HasConfirmedCustomFormTrigger(string? configJson)
    {
        var config = ParseConfig(configJson);

        if (config["trigger"] is JsonArray triggerValues)
        {
            foreach (var value in triggerValues.OfType<JsonValue>())
            {
                var name = value.TryGetValue<string>(out var raw) ? raw : null;
                if (IsCustomFormName(name)) return true;
            }
        }

        if (config["confirmedAddons"] is JsonArray confirmedAddons)
        {
            foreach (var addon in confirmedAddons.OfType<JsonObject>())
            {
                if (!string.Equals(addon["type"]?.GetValue<string>(), "Trigger", StringComparison.OrdinalIgnoreCase))
                    continue;
                if (IsCustomFormName(addon["name"]?.GetValue<string>()))
                    return true;
            }
        }

        return false;
    }

    private static bool IsCustomFormName(string? value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant().Replace(" ", string.Empty).Replace("-", string.Empty).Replace("_", string.Empty);
        return normalized is "websiteform" or "customform";
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

    private static void ValidateFormDto(UpsertDevUserServiceFormDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Label))
            throw new ArgumentException("Form label is required.");
        if (dto.Schema.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined || dto.Schema.ValueKind != JsonValueKind.Object)
            throw new ArgumentException("Form schema must be a JSON object.");
    }

    private static string ExtractWebhookUrl(JsonElement schema)
    {
        if (schema.ValueKind != JsonValueKind.Object) return string.Empty;
        if (schema.TryGetProperty("productionWebhookUrl", out var direct) && direct.ValueKind == JsonValueKind.String)
            return direct.GetString()?.Trim() ?? string.Empty;
        if (schema.TryGetProperty("meta", out var meta)
            && meta.ValueKind == JsonValueKind.Object
            && meta.TryGetProperty("productionWebhookUrl", out var nested)
            && nested.ValueKind == JsonValueKind.String)
            return nested.GetString()?.Trim() ?? string.Empty;
        return string.Empty;
    }

    private static string NormalizeResponseMode(string? responseMode) =>
        string.IsNullOrWhiteSpace(responseMode) ? "inline" : responseMode.Trim().ToLowerInvariant();
}
