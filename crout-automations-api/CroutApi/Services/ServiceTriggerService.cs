using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using CroutApi.DTOs;
using CroutApi.DTOs.ServiceTriggers;
using CroutApi.Models;
using CroutApi.Repositories;
using Microsoft.Extensions.Options;

namespace CroutApi.Services;

public class ServiceTriggerService(
    IServiceTriggerRepository repo,
    IIntegrationRepository integrations,
    IUserServiceRepository userServices,
    IHttpClientFactory httpFactory,
    IOptions<N8nOptions> n8nOptions) : IServiceTriggerService
{
    public async Task<IEnumerable<ServiceTriggerConfigDto>> GetConfigsAsync(int userId, int companyId, int serviceId, int? userServiceId = null)
    {
        if (userServiceId is int scopedUserServiceId)
        {
            var legacyConfigs = (await repo.GetConfigsAsync(userId, companyId, serviceId, userServiceId)).Select(ToDto).ToList();
            if (legacyConfigs.Count > 0)
                return legacyConfigs;

            var customForm = await TryBuildCustomFormTriggerAsync(scopedUserServiceId, serviceId, userId);
            if (customForm is not null)
                return [customForm];
        }

        var configs = await repo.GetConfigsAsync(userId, companyId, serviceId, userServiceId);
        return configs.Select(ToDto);
    }

    public async Task<ExecuteTriggerResponseDto> ExecuteAsync(int userId, int configId, int companyId, int? userServiceId, string? payloadJson, IEnumerable<string> fileNames)
    {
        if (userServiceId is int scopedUserServiceId && configId < 0)
        {
            var context = await integrations.GetCustomFormContextByUserServiceIdAsync(scopedUserServiceId);
            var userService = await userServices.GetByIdAsync(scopedUserServiceId);
            if (context is not null
                && userService is not null
                && context.CompanyOwnerUserId == userId
                && -context.IntegrationId == configId
                && HasConfirmedCustomFormTrigger(userService.Config))
            {
                var integration = await integrations.GetByIntegrationIdAsync(context.IntegrationId);
                if (integration is not null)
                    return await ExecuteCustomFormAsync(integration, context, companyId, userId, payloadJson, fileNames);
            }
        }

        var config = await repo.GetConfigForExecutionAsync(userId, configId, companyId, userServiceId)
            ?? throw new UnauthorizedAccessException("Trigger config is not available for this service.");

        var requestPayload = BuildRequestPayload(config, payloadJson, fileNames);
        var baseUrl = n8nOptions.Value.BaseUrl;
        var apiKey = n8nOptions.Value.ApiKey;
        var liveReady = !string.IsNullOrWhiteSpace(baseUrl) && !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(config.EndpointPath);

        var status = "queued";
        var mode = liveReady ? "live" : "mock";
        string? error = null;
        JsonElement response;

        if (!liveReady)
        {
            response = Parse("""
            {"accepted":true,"mode":"mock","message":"Workflow queued locally because live n8n environment values are not configured."}
            """)!.Value;
        }
        else
        {
            try
            {
                response = await CallN8nAsync(baseUrl!, apiKey!, config.EndpointPath!, requestPayload);
            }
            catch (Exception ex)
            {
                status = "failed";
                error = ex.Message;
                mode = "live";
                response = Parse(JsonSerializer.Serialize(new { accepted = false, mode, message = "n8n call failed.", error }))!.Value;
            }
        }

        var execution = new ServiceTriggerExecution
        {
            ServiceTriggerConfigId = config.ServiceTriggerConfigId,
            UserId = userId,
            CompanyId = companyId,
            UserServiceId = userServiceId ?? config.UserServiceId,
            RequestPayload = requestPayload,
            ResponsePayload = response.GetRawText(),
            Status = status,
            Mode = mode,
            ErrorMessage = error
        };
        var executionId = await repo.CreateExecutionAsync(execution);

        var message = mode == "mock"
            ? "Workflow queued in mock mode. Configure backend n8n environment values for live execution."
            : status == "failed" ? "Workflow execution failed." : "Workflow sent to n8n.";
        return new ExecuteTriggerResponseDto(executionId, status, mode, message, response);
    }

    private async Task<ServiceTriggerConfigDto?> TryBuildCustomFormTriggerAsync(int userServiceId, int serviceId, int userId)
    {
        var context = await integrations.GetCustomFormContextByUserServiceIdAsync(userServiceId);
        var userService = await userServices.GetByIdAsync(userServiceId);
        if (context is null
            || userService is null
            || context.CompanyOwnerUserId != userId
            || context.ServiceId != serviceId
            || !HasConfirmedCustomFormTrigger(userService.Config))
        {
            return null;
        }

        return BuildCustomFormTriggerConfig(context, serviceId);
    }

    private async Task<ExecuteTriggerResponseDto> ExecuteCustomFormAsync(
        Integration integration,
        CustomFormAccessContextDto context,
        int companyId,
        int userId,
        string? payloadJson,
        IEnumerable<string> fileNames)
    {
        var runtimeConfig = BuildCustomFormTriggerConfig(context, context.ServiceId)
            ?? throw new InvalidOperationException("Custom form data is not available for this service.");
        var requestPayload = BuildRequestPayload("WebsiteForm", integration.WorkflowId, payloadJson, fileNames);

        var baseUrl = n8nOptions.Value.BaseUrl;
        var apiKey = n8nOptions.Value.ApiKey;
        var webhookUrl = NormalizeWebhookUrl(context.WebhookUrl, baseUrl);
        var liveReady = !string.IsNullOrWhiteSpace(webhookUrl);

        var status = "queued";
        var mode = liveReady ? "live" : "mock";
        string? error = null;
        JsonElement response;

        if (!liveReady)
        {
            response = Parse("""{"accepted":true,"mode":"mock","message":"Custom form queued locally because a live webhook endpoint is not configured."}""")!.Value;
        }
        else
        {
            try
            {
                response = await CallWebhookAsync(webhookUrl!, requestPayload);
            }
            catch (Exception ex)
            {
                status = "failed";
                error = ex.Message;
                response = Parse(JsonSerializer.Serialize(new { accepted = false, mode = "live", message = "Custom form execution failed.", error }))!.Value;
            }
        }

        var execution = new ServiceTriggerExecution
        {
            ServiceTriggerConfigId = runtimeConfig.Id,
            UserId = userId,
            CompanyId = companyId,
            UserServiceId = integration.UserServiceId,
            RequestPayload = requestPayload,
            ResponsePayload = response.GetRawText(),
            Status = status,
            Mode = mode,
            ErrorMessage = error
        };
        var executionId = await repo.CreateExecutionAsync(execution);
        var message = mode == "mock"
            ? "Custom form queued in mock mode."
            : status == "failed" ? "Custom form execution failed." : "Custom form sent to n8n.";

        return new ExecuteTriggerResponseDto(executionId, status, mode, message, response);
    }

    private static ServiceTriggerConfigDto ToDto(ServiceTriggerConfig config) => new(
        config.ServiceTriggerConfigId,
        config.ServiceId,
        config.UserServiceId,
        config.WorkflowId,
        config.TriggerType,
        config.Label,
        config.Description,
        config.Method,
        config.RequiresConfirmation,
        Parse(config.PayloadTemplate),
        Parse(config.FieldsJson),
        Parse(config.FileUploadJson),
        config.ResponseMode,
        null,
        null);

    private static string BuildRequestPayload(ServiceTriggerConfig config, string? payloadJson, IEnumerable<string> fileNames)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(payloadJson) ? "{}" : payloadJson);
        var payload = new
        {
            workflowId = config.WorkflowId,
            triggerType = config.TriggerType,
            payload = doc.RootElement.Clone(),
            files = fileNames.Select(name => new { name }).ToArray()
        };
        return JsonSerializer.Serialize(payload);
    }

    private static string BuildRequestPayload(string triggerType, string? workflowId, string? payloadJson, IEnumerable<string> fileNames)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(payloadJson) ? "{}" : payloadJson);
        var payload = new
        {
            workflowId,
            triggerType,
            payload = doc.RootElement.Clone(),
            files = fileNames.Select(name => new { name }).ToArray()
        };
        return JsonSerializer.Serialize(payload);
    }

    private async Task<JsonElement> CallN8nAsync(string baseUrl, string apiKey, string endpointPath, string requestPayload)
    {
        var client = httpFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        var url = new Uri(new Uri(baseUrl.TrimEnd('/') + "/"), endpointPath.TrimStart('/'));
        var response = await client.PostAsync(url, new StringContent(requestPayload, Encoding.UTF8, "application/json"));
        var content = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"n8n returned {(int)response.StatusCode}.");
        return Parse(string.IsNullOrWhiteSpace(content) ? "{\"accepted\":true}" : content)!.Value;
    }

    private async Task<JsonElement> CallWebhookAsync(string webhookUrl, string requestPayload)
    {
        var client = httpFactory.CreateClient();
        var response = await client.PostAsync(webhookUrl, new StringContent(requestPayload, Encoding.UTF8, "application/json"));
        var content = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Webhook returned {(int)response.StatusCode}: {TrimError(content)}");
        return Parse(string.IsNullOrWhiteSpace(content) ? "{\"accepted\":true}" : content)!.Value;
    }

    private static JsonElement? Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }

    private static ServiceTriggerConfigDto? BuildCustomFormTriggerConfig(CustomFormAccessContextDto context, int serviceId)
    {
        var schemaJson = !string.IsNullOrWhiteSpace(context.PublishedSchemaJson)
            ? context.PublishedSchemaJson
            : context.DraftSchemaJson;
        if (string.IsNullOrWhiteSpace(schemaJson))
            return null;

        using var doc = JsonDocument.Parse(schemaJson);
        var root = doc.RootElement;
        var label = root.TryGetProperty("label", out var labelNode) && labelNode.ValueKind == JsonValueKind.String
            ? labelNode.GetString() ?? context.Title ?? "Website Form"
            : context.Title ?? "Website Form";
        var description = root.TryGetProperty("description", out var descriptionNode) && descriptionNode.ValueKind == JsonValueKind.String
            ? descriptionNode.GetString()
            : null;
        var responseMode = root.TryGetProperty("responseMode", out var responseNode) && responseNode.ValueKind == JsonValueKind.String
            ? responseNode.GetString() ?? "inline"
            : "inline";
        var payloadTemplate = root.TryGetProperty("payloadTemplate", out var payloadNode)
            ? payloadNode.Clone()
            : Parse("{}")!.Value;
        var formSchema = root.TryGetProperty("schema", out var schemaNode)
            ? schemaNode.Clone()
            : (JsonElement?)null;
        var fields = formSchema is JsonElement schema ? BuildLegacyFormFields(schema) : null;
        var activeTabId = ExtractActiveTabId(formSchema);

        return new ServiceTriggerConfigDto(
            -context.IntegrationId,
            serviceId,
            context.UserServiceId,
            null,
            "form",
            label,
            description ?? "Custom website form linked to this confirmed trigger add-on.",
            "POST",
            false,
            payloadTemplate,
            fields,
            null,
            responseMode,
            formSchema,
            activeTabId);
    }

    private static JsonElement? BuildLegacyFormFields(JsonElement schemaRoot)
    {
        if (!schemaRoot.TryGetProperty("elements", out var elements) || elements.ValueKind != JsonValueKind.Array)
            return null;

        var fields = new List<object>();
        foreach (var element in elements.EnumerateArray())
        {
            if (!element.TryGetProperty("type", out var typeNode) || typeNode.ValueKind != JsonValueKind.String)
                continue;

            var type = typeNode.GetString() ?? string.Empty;
            switch (type)
            {
                case "input":
                    fields.Add(new
                    {
                        key = GetString(element, "key"),
                        label = GetString(element, "label") ?? GetString(element, "key") ?? "Field",
                        type = MapLegacyInputMode(GetString(element, "inputMode")),
                        required = GetBoolean(element, "required"),
                        hidden = GetBoolean(element, "hidden"),
                        placeholder = GetString(element, "placeholder"),
                        defaultValue = GetString(element, "defaultValueText"),
                        validation = ExtractValidation(element)
                    });
                    break;
                case "select":
                    fields.Add(new
                    {
                        key = GetString(element, "key"),
                        label = GetString(element, "label") ?? GetString(element, "key") ?? "Field",
                        type = string.Equals(GetString(element, "selectMode"), "multiSelect", StringComparison.OrdinalIgnoreCase) ? "multi-select" : "select",
                        required = GetBoolean(element, "required"),
                        placeholder = GetString(element, "placeholder"),
                        defaultValue = GetString(element, "defaultValueText"),
                        options = ExtractOptions(element)
                    });
                    break;
                case "datetime":
                    fields.Add(new
                    {
                        key = GetString(element, "key"),
                        label = GetString(element, "label") ?? GetString(element, "key") ?? "Field",
                        type = MapLegacyDateTimeMode(GetString(element, "dateTimeMode")),
                        required = GetBoolean(element, "required"),
                        placeholder = GetString(element, "placeholder"),
                        defaultValue = GetString(element, "defaultValueText")
                    });
                    break;
                case "checkbox":
                    fields.Add(new
                    {
                        key = GetString(element, "key"),
                        label = GetString(element, "label") ?? GetString(element, "key") ?? "Field",
                        type = HasMultipleOptions(element) ? "multi-select" : "checkbox",
                        required = GetBoolean(element, "required"),
                        hidden = GetBoolean(element, "hidden"),
                        placeholder = HasMultipleOptions(element) ? "Select all that apply." : "Enabled",
                        options = ExtractOptions(element)
                    });
                    break;
                case "list":
                    fields.Add(new
                    {
                        key = GetString(element, "key"),
                        label = GetString(element, "label") ?? GetString(element, "key") ?? "List",
                        type = "json",
                        required = false,
                        placeholder = $"Enter a JSON array for {GetString(element, "label") ?? GetString(element, "key") ?? "this list"}."
                    });
                    break;
            }
        }

        return fields.Count == 0 ? null : Parse(JsonSerializer.Serialize(fields))!.Value;
    }

    private static string? ExtractActiveTabId(JsonElement? formSchema)
    {
        if (formSchema is not JsonElement schemaRoot)
            return null;
        if (!schemaRoot.TryGetProperty("elements", out var elements) || elements.ValueKind != JsonValueKind.Array)
            return null;

        foreach (var element in elements.EnumerateArray())
        {
            if (!element.TryGetProperty("type", out var typeNode) || typeNode.ValueKind != JsonValueKind.String)
                continue;
            if (!string.Equals(typeNode.GetString(), "tabs", StringComparison.OrdinalIgnoreCase))
                continue;
            var activeTabId = GetString(element, "activeTabId");
            if (!string.IsNullOrWhiteSpace(activeTabId))
                return activeTabId;
            if (!element.TryGetProperty("tabs", out var tabs) || tabs.ValueKind != JsonValueKind.Array)
                return null;
            foreach (var tab in tabs.EnumerateArray())
            {
                var firstTabId = GetString(tab, "id");
                if (!string.IsNullOrWhiteSpace(firstTabId))
                    return firstTabId;
            }
            return null;
        }

        return null;
    }

    private static string? GetString(JsonElement element, string propertyName) =>
        element.TryGetProperty(propertyName, out var node) && node.ValueKind == JsonValueKind.String
            ? node.GetString()
            : null;

    private static bool GetBoolean(JsonElement element, string propertyName) =>
        element.TryGetProperty(propertyName, out var node) && node.ValueKind == JsonValueKind.True;

    private static object? ExtractValidation(JsonElement element)
    {
        if (!element.TryGetProperty("validation", out var validation) || validation.ValueKind != JsonValueKind.Object)
            return null;
        return JsonSerializer.Deserialize<object>(validation.GetRawText());
    }

    private static object[]? ExtractOptions(JsonElement element)
    {
        if (!element.TryGetProperty("options", out var options) || options.ValueKind != JsonValueKind.Array)
            return null;

        var items = options.EnumerateArray()
            .Select(option => new
            {
                label = GetString(option, "label") ?? GetString(option, "value") ?? "Option",
                value = GetString(option, "value") ?? GetString(option, "label") ?? string.Empty
            })
            .ToArray<object>();

        return items.Length == 0 ? null : items;
    }

    private static bool HasMultipleOptions(JsonElement element) =>
        element.TryGetProperty("options", out var options)
        && options.ValueKind == JsonValueKind.Array
        && options.GetArrayLength() > 1;

    private static string MapLegacyInputMode(string? inputMode) => inputMode?.ToLowerInvariant() switch
    {
        "textarea" => "textarea",
        "richtext" => "richText",
        "number" => "number",
        "email" => "email",
        "hidden" => "hidden",
        _ => "text"
    };

    private static string MapLegacyDateTimeMode(string? mode) => mode?.ToLowerInvariant() switch
    {
        "date" => "date",
        "time" => "time",
        "daterange" => "dateRange",
        _ => "datetime"
    };

    private static string? NormalizeWebhookUrl(string? webhookUrl, string? fallbackBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(webhookUrl))
            return null;
        if (Uri.TryCreate(webhookUrl.Trim(), UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp))
            return uri.ToString();

        if (Uri.TryCreate(fallbackBaseUrl?.Trim(), UriKind.Absolute, out var baseUri))
            return new Uri(baseUri, webhookUrl.TrimStart('/')).ToString();

        return null;
    }

    private static string TrimError(string content) =>
        string.IsNullOrWhiteSpace(content)
            ? "The webhook did not return an error message."
            : content.Length <= 240 ? content : content[..240];

    private static bool HasConfirmedCustomFormTrigger(string? configJson)
    {
        if (string.IsNullOrWhiteSpace(configJson)) return false;

        try
        {
            var config = JsonNode.Parse(configJson) as JsonObject;
            if (config is null) return false;

            if (config["trigger"] is JsonArray triggerValues
                && triggerValues.OfType<JsonValue>()
                    .Select(value => value.TryGetValue<string>(out var raw) ? raw : null)
                    .Any(IsCustomFormName))
            {
                return true;
            }

            if (config["confirmedAddons"] is JsonArray confirmedAddons)
            {
                foreach (var addon in confirmedAddons.OfType<JsonObject>())
                {
                    if (!string.Equals(addon["type"]?.GetValue<string>(), WorkflowRoles.Trigger, StringComparison.OrdinalIgnoreCase))
                        continue;
                    if (IsCustomFormName(addon["name"]?.GetValue<string>()))
                        return true;
                }
            }
        }
        catch
        {
            return false;
        }

        return false;
    }

    private static bool IsCustomFormName(string? value)
    {
        var normalized = (value ?? string.Empty).Trim().ToLowerInvariant().Replace(" ", string.Empty).Replace("-", string.Empty).Replace("_", string.Empty);
        return normalized is "websiteform" or "customform";
    }
}
