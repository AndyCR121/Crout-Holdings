using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CroutApi.DTOs.ServiceTriggers;
using CroutApi.Models;
using CroutApi.Repositories;
using Microsoft.Extensions.Options;

namespace CroutApi.Services;

public class ServiceTriggerService(
    IServiceTriggerRepository repo,
    IWorkflowCapabilityRepository workflowRepo,
    IIntegrationRepository integrations,
    IHttpClientFactory httpFactory,
    IOptions<N8nOptions> n8nOptions) : IServiceTriggerService
{
    public async Task<IEnumerable<ServiceTriggerConfigDto>> GetConfigsAsync(int userId, int companyId, int serviceId, int? userServiceId = null)
    {
        if (userServiceId is int scopedUserServiceId)
        {
            var access = await workflowRepo.GetUserServiceAccessContextAsync(scopedUserServiceId);
            if (access is not null && access.OwnerUserId == userId && access.ServiceId == serviceId)
            {
                var steps = (await workflowRepo.GetWorkflowStepsByUserServiceIdAsync(scopedUserServiceId))
                    .Where(step =>
                        step.Role.Equals(WorkflowRoles.Trigger, StringComparison.OrdinalIgnoreCase) &&
                        step.Status.Equals(WorkflowStepStatuses.Confirmed, StringComparison.OrdinalIgnoreCase))
                    .Select(MapWorkflowStepToTriggerConfig)
                    .ToList();

                if (steps.Count > 0)
                    return steps;
            }

            var legacyConfigs = (await repo.GetConfigsAsync(userId, companyId, serviceId, userServiceId)).Select(ToDto).ToList();
            if (legacyConfigs.Count > 0)
                return legacyConfigs;

            var legacyCustomForm = await TryBuildLegacyCustomFormTriggerAsync(scopedUserServiceId, serviceId, access, userId);
            if (legacyCustomForm is not null)
                return [legacyCustomForm];
        }

        var configs = await repo.GetConfigsAsync(userId, companyId, serviceId, userServiceId);
        return configs.Select(ToDto);
    }

    public async Task<ExecuteTriggerResponseDto> ExecuteAsync(int userId, int configId, int companyId, int? userServiceId, string? payloadJson, IEnumerable<string> fileNames)
    {
        if (userServiceId is int scopedUserServiceId)
        {
            var access = await workflowRepo.GetUserServiceAccessContextAsync(scopedUserServiceId);
            if (access is not null && access.OwnerUserId == userId)
            {
                var step = await workflowRepo.GetWorkflowStepByIdAsync(configId);
                if (step is not null
                    && step.UserServiceId == scopedUserServiceId
                    && step.Role.Equals(WorkflowRoles.Trigger, StringComparison.OrdinalIgnoreCase)
                    && step.Status.Equals(WorkflowStepStatuses.Confirmed, StringComparison.OrdinalIgnoreCase))
                {
                    return await ExecuteWorkflowStepAsync(step, userId, companyId, payloadJson, fileNames);
                }

                if (configId < 0)
                {
                    var integration = await integrations.GetByUserServiceIdAsync(scopedUserServiceId);
                    if (integration is not null && -integration.IntegrationId == configId)
                        return await ExecuteLegacyCustomFormAsync(integration, serviceId: access.ServiceId, userId, companyId, payloadJson, fileNames);
                }
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

    private async Task<ServiceTriggerConfigDto?> TryBuildLegacyCustomFormTriggerAsync(int userServiceId, int serviceId, UserServiceAccessContext? access, int userId)
    {
        if (access is null || access.OwnerUserId != userId || access.ServiceId != serviceId)
            return null;

        var integration = await integrations.GetByUserServiceIdAsync(userServiceId);
        if (integration is null)
            return null;

        return BuildLegacyCustomFormTriggerConfig(integration, serviceId);
    }

    private async Task<ExecuteTriggerResponseDto> ExecuteLegacyCustomFormAsync(Integration integration, int serviceId, int userId, int companyId, string? payloadJson, IEnumerable<string> fileNames)
    {
        var runtimeConfig = BuildLegacyCustomFormTriggerConfig(integration, serviceId)
            ?? throw new InvalidOperationException("Legacy custom form data is not available for this service.");
        var requestPayload = BuildRequestPayload(
            "WebsiteForm",
            integration.WorkflowId,
            payloadJson,
            fileNames);

        var baseUrl = n8nOptions.Value.BaseUrl;
        var apiKey = n8nOptions.Value.ApiKey;
        var endpointPath = ExtractEndpointPath(integration.CustomFormWebhookUrl);
        var liveReady = !string.IsNullOrWhiteSpace(baseUrl) && !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(endpointPath);

        var status = "queued";
        var mode = liveReady ? "live" : "mock";
        string? error = null;
        JsonElement response;

        if (!liveReady)
        {
            response = Parse("""{"accepted":true,"mode":"mock","message":"Legacy custom form queued locally because a live webhook endpoint is not configured."}""")!.Value;
        }
        else
        {
            try
            {
                response = await CallN8nAsync(baseUrl!, apiKey!, endpointPath!, requestPayload);
            }
            catch (Exception ex)
            {
                status = "failed";
                error = ex.Message;
                response = Parse(JsonSerializer.Serialize(new { accepted = false, mode = "live", message = "Legacy custom form execution failed.", error }))!.Value;
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
            ? "Legacy custom form queued in mock mode."
            : status == "failed" ? "Legacy custom form execution failed." : "Legacy custom form sent to n8n.";

        return new ExecuteTriggerResponseDto(executionId, status, mode, message, response);
    }

    private async Task<ExecuteTriggerResponseDto> ExecuteWorkflowStepAsync(UserServiceWorkflowStep step, int userId, int companyId, string? payloadJson, IEnumerable<string> fileNames)
    {
        var runtime = ParseRuntimeSchema(step.ConfigurationSchemaJson);
        var requestPayload = BuildRequestPayload(
            step.CapabilityType,
            runtime.WorkflowId,
            payloadJson,
            fileNames);

        var baseUrl = n8nOptions.Value.BaseUrl;
        var apiKey = n8nOptions.Value.ApiKey;
        var liveReady = !string.IsNullOrWhiteSpace(baseUrl) && !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(runtime.EndpointPath);

        var status = "queued";
        var mode = liveReady ? "live" : "mock";
        string? error = null;
        JsonElement response;

        if (!liveReady)
        {
            response = Parse("""{"accepted":true,"mode":"mock","message":"Workflow step queued locally because live endpoint configuration is missing."}""")!.Value;
        }
        else
        {
            try
            {
                response = await CallN8nAsync(baseUrl!, apiKey!, runtime.EndpointPath!, requestPayload);
            }
            catch (Exception ex)
            {
                status = "failed";
                error = ex.Message;
                response = Parse(JsonSerializer.Serialize(new { accepted = false, mode = "live", message = "Workflow step execution failed.", error }))!.Value;
            }
        }

        var execution = new ServiceTriggerExecution
        {
            ServiceTriggerConfigId = step.Id,
            UserId = userId,
            CompanyId = companyId,
            UserServiceId = step.UserServiceId,
            RequestPayload = requestPayload,
            ResponsePayload = response.GetRawText(),
            Status = status,
            Mode = mode,
            ErrorMessage = error
        };
        var executionId = await repo.CreateExecutionAsync(execution);
        var message = mode == "mock"
            ? "Workflow step queued in mock mode."
            : status == "failed" ? "Workflow step execution failed." : "Workflow step sent to n8n.";

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

    private static string BuildRequestPayload(string capabilityType, string? workflowId, string? payloadJson, IEnumerable<string> fileNames)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(payloadJson) ? "{}" : payloadJson);
        var payload = new
        {
            workflowId,
            triggerType = capabilityType,
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

    private static JsonElement? Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }

    private static ServiceTriggerConfigDto MapWorkflowStepToTriggerConfig(UserServiceWorkflowStep step)
    {
        var runtime = ParseRuntimeSchema(step.ConfigurationSchemaJson);
        return new ServiceTriggerConfigDto(
            step.Id,
            step.ServiceId,
            step.UserServiceId,
            runtime.WorkflowId,
            NormalizeTriggerType(step.CapabilityType),
            step.CapabilityName,
            step.CapabilityDescription,
            runtime.Method,
            false,
            runtime.PayloadTemplate,
            runtime.Fields,
            runtime.FileUpload,
            runtime.ResponseMode,
            null,
            null);
    }

    private static ServiceTriggerConfigDto? BuildLegacyCustomFormTriggerConfig(Integration integration, int serviceId)
    {
        var schemaJson = !string.IsNullOrWhiteSpace(integration.CustomFormPublishedSchemaJson)
            ? integration.CustomFormPublishedSchemaJson
            : integration.CustomFormDraftSchemaJson;
        if (string.IsNullOrWhiteSpace(schemaJson))
            return null;

        using var doc = JsonDocument.Parse(schemaJson);
        var root = doc.RootElement;
        var label = root.TryGetProperty("label", out var labelNode) && labelNode.ValueKind == JsonValueKind.String
            ? labelNode.GetString() ?? integration.CustomFormTitle ?? "Website Form"
            : integration.CustomFormTitle ?? "Website Form";
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
        var fields = formSchema is JsonElement schema
            ? BuildLegacyFormFields(schema)
            : null;
        var activeTabId = ExtractActiveTabId(formSchema);

        return new ServiceTriggerConfigDto(
            -integration.IntegrationId,
            serviceId,
            integration.UserServiceId,
            integration.WorkflowId,
            "form",
            label,
            description ?? "Legacy website form fallback. Save the canonical workflow capability to replace this compatibility path.",
            "POST",
            false,
            payloadTemplate,
            fields,
            null,
            responseMode,
            formSchema,
            activeTabId);
    }

    private static string NormalizeTriggerType(string capabilityType)
    {
        if (capabilityType.Equals("WebsiteForm", StringComparison.OrdinalIgnoreCase) || capabilityType.Equals("CustomForm", StringComparison.OrdinalIgnoreCase))
            return "form";
        if (capabilityType.Equals("Webhook", StringComparison.OrdinalIgnoreCase))
            return "webhook";
        return "custom";
    }

    private static TriggerRuntimeSchema ParseRuntimeSchema(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new TriggerRuntimeSchema();

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        return new TriggerRuntimeSchema
        {
            WorkflowId = root.TryGetProperty("workflowId", out var workflowId) ? workflowId.GetString() : null,
            EndpointPath = root.TryGetProperty("endpointPath", out var endpointPath) ? endpointPath.GetString() : null,
            Method = root.TryGetProperty("method", out var method) && method.ValueKind == JsonValueKind.String ? method.GetString() ?? "POST" : "POST",
            ResponseMode = root.TryGetProperty("responseMode", out var responseMode) && responseMode.ValueKind == JsonValueKind.String ? responseMode.GetString() ?? "inline" : "inline",
            PayloadTemplate = root.TryGetProperty("payloadTemplate", out var payloadTemplate) ? payloadTemplate.Clone() : (JsonElement?)null,
            Fields = root.TryGetProperty("fields", out var fields) ? fields.Clone() : (JsonElement?)null,
            FileUpload = root.TryGetProperty("fileUpload", out var fileUpload) ? fileUpload.Clone() : (JsonElement?)null
        };
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

        return fields.Count == 0
            ? null
            : Parse(JsonSerializer.Serialize(fields))!.Value;
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

    private static string? ExtractEndpointPath(string? webhookUrl)
    {
        if (string.IsNullOrWhiteSpace(webhookUrl))
            return null;
        if (!Uri.TryCreate(webhookUrl, UriKind.Absolute, out var uri))
            return webhookUrl;
        return string.Concat(uri.AbsolutePath, uri.Query);
    }

    private sealed class TriggerRuntimeSchema
    {
        public string? WorkflowId { get; init; }
        public string? EndpointPath { get; init; }
        public string Method { get; init; } = "POST";
        public string ResponseMode { get; init; } = "inline";
        public JsonElement? PayloadTemplate { get; init; }
        public JsonElement? Fields { get; init; }
        public JsonElement? FileUpload { get; init; }
    }
}
