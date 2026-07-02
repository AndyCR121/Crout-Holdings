using System.Text.Json;
using System.Text.Json.Nodes;
using CroutApi.DTOs;
using CroutApi.Helpers;
using CroutApi.Models;
using CroutApi.Repositories;

namespace CroutApi.Services;

public class WorkflowCapabilityService(
    IWorkflowCapabilityRepository workflowRepo,
    IIntegrationRepository integrations,
    IUserServiceRepository userServices,
    IServiceRepository services,
    SensitiveDataProtector protector) : IWorkflowCapabilityService
{
    private static readonly HashSet<string> SecretFieldTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "password",
        "secret",
        "hidden"
    };

    public async Task<IEnumerable<WorkflowIntegrationDefinitionDto>> GetIntegrationDefinitionsAsync(bool activeOnly) =>
        (await workflowRepo.GetIntegrationDefinitionsAsync(activeOnly)).Select(ToDto);

    public async Task<WorkflowIntegrationDefinitionDto> CreateIntegrationDefinitionAsync(UpsertWorkflowIntegrationDefinitionDto dto)
    {
        var definition = new WorkflowIntegrationDefinition
        {
            Name = RequireValue(dto.Name, "Integration name is required."),
            Description = TrimOrNull(dto.Description),
            IntegrationType = RequireValue(dto.IntegrationType, "Integration type is required."),
            HasCredentials = dto.HasCredentials,
            CredentialFormSchemaJson = SerializeOptionalObject(dto.CredentialFormSchema, "Credential schema must be a JSON object when supplied."),
            IsActive = dto.IsActive
        };

        ValidateCredentialSchema(definition.HasCredentials, definition.CredentialFormSchemaJson);
        definition.Id = await workflowRepo.CreateIntegrationDefinitionAsync(definition);
        return ToDto((await workflowRepo.GetIntegrationDefinitionByIdAsync(definition.Id))!);
    }

    public async Task<WorkflowIntegrationDefinitionDto> UpdateIntegrationDefinitionAsync(int integrationId, UpsertWorkflowIntegrationDefinitionDto dto)
    {
        var current = await workflowRepo.GetIntegrationDefinitionByIdAsync(integrationId)
            ?? throw new KeyNotFoundException("Integration definition not found.");

        current.Name = RequireValue(dto.Name, "Integration name is required.");
        current.Description = TrimOrNull(dto.Description);
        current.IntegrationType = RequireValue(dto.IntegrationType, "Integration type is required.");
        current.HasCredentials = dto.HasCredentials;
        current.CredentialFormSchemaJson = SerializeOptionalObject(dto.CredentialFormSchema, "Credential schema must be a JSON object when supplied.");
        current.IsActive = dto.IsActive;

        ValidateCredentialSchema(current.HasCredentials, current.CredentialFormSchemaJson);
        await workflowRepo.UpdateIntegrationDefinitionAsync(current);
        return ToDto((await workflowRepo.GetIntegrationDefinitionByIdAsync(integrationId))!);
    }

    public async Task DeleteIntegrationDefinitionAsync(int integrationId)
    {
        _ = await workflowRepo.GetIntegrationDefinitionByIdAsync(integrationId)
            ?? throw new KeyNotFoundException("Integration definition not found.");
        await workflowRepo.DeleteIntegrationDefinitionAsync(integrationId);
    }

    public async Task<IEnumerable<ServiceWorkflowCapabilityDto>> GetServiceCapabilitiesAsync(int serviceId, bool activeOnly)
    {
        _ = await services.GetByIdAsync(serviceId) ?? throw new KeyNotFoundException("Service not found.");
        return (await workflowRepo.GetCapabilitiesByServiceAsync(serviceId, activeOnly)).Select(ToDto);
    }

    public async Task<ServiceWorkflowCapabilityDto> CreateServiceCapabilityAsync(UpsertServiceWorkflowCapabilityDto dto)
    {
        await ValidateCapabilityDtoAsync(dto);
        var capability = new ServiceWorkflowCapability
        {
            ServiceId = dto.ServiceId,
            Role = NormalizeRole(dto.Role),
            CapabilityType = RequireValue(dto.CapabilityType, "Capability type is required."),
            Name = RequireValue(dto.Name, "Capability name is required."),
            Description = TrimOrNull(dto.Description),
            Price = dto.Price,
            DisplayOrder = dto.DisplayOrder,
            IsActive = dto.IsActive,
            IntegrationId = dto.IntegrationId,
            RequiresCredentials = dto.RequiresCredentials,
            ConfigurationSchemaJson = SerializeOptionalObject(dto.ConfigurationSchema, "Configuration schema must be a JSON object when supplied.")
        };

        capability.Id = await workflowRepo.CreateCapabilityAsync(capability);
        return ToDto((await workflowRepo.GetCapabilityByIdAsync(capability.Id))!);
    }

    public async Task<ServiceWorkflowCapabilityDto> UpdateServiceCapabilityAsync(int capabilityId, UpsertServiceWorkflowCapabilityDto dto)
    {
        var current = await workflowRepo.GetCapabilityByIdAsync(capabilityId)
            ?? throw new KeyNotFoundException("Workflow capability not found.");

        dto.ServiceId = dto.ServiceId == 0 ? current.ServiceId : dto.ServiceId;
        await ValidateCapabilityDtoAsync(dto);

        current.ServiceId = dto.ServiceId;
        current.Role = NormalizeRole(dto.Role);
        current.CapabilityType = RequireValue(dto.CapabilityType, "Capability type is required.");
        current.Name = RequireValue(dto.Name, "Capability name is required.");
        current.Description = TrimOrNull(dto.Description);
        current.Price = dto.Price;
        current.DisplayOrder = dto.DisplayOrder;
        current.IsActive = dto.IsActive;
        current.IntegrationId = dto.IntegrationId;
        current.RequiresCredentials = dto.RequiresCredentials;
        current.ConfigurationSchemaJson = SerializeOptionalObject(dto.ConfigurationSchema, "Configuration schema must be a JSON object when supplied.");

        await workflowRepo.UpdateCapabilityAsync(current);
        return ToDto((await workflowRepo.GetCapabilityByIdAsync(capabilityId))!);
    }

    public async Task DeleteServiceCapabilityAsync(int capabilityId)
    {
        _ = await workflowRepo.GetCapabilityByIdAsync(capabilityId)
            ?? throw new KeyNotFoundException("Workflow capability not found.");
        await workflowRepo.DeleteCapabilityAsync(capabilityId);
    }

    public async Task<IEnumerable<UserServiceWorkflowStepDto>> GetWorkflowStepsAsync(int callerUserId, bool isAdmin, bool isDeveloper, int userServiceId)
    {
        var access = await RequireAccessAsync(callerUserId, isAdmin, isDeveloper, userServiceId, allowClient: true, allowDeveloper: true);
        _ = access;
        return (await workflowRepo.GetWorkflowStepsByUserServiceIdAsync(userServiceId)).Select(ToDto);
    }

    public async Task<IEnumerable<UserServiceWorkflowStepDto>> SaveRequestedSelectionAsync(int callerUserId, bool isAdmin, int userServiceId, WorkflowStepSelectionDto dto)
    {
        var access = await RequireAccessAsync(callerUserId, isAdmin, false, userServiceId, allowClient: true, allowDeveloper: false);
        if (dto.CapabilityIds is null || dto.CapabilityIds.Length == 0)
            throw new ArgumentException("Select at least one workflow integration before saving.");

        var capabilities = await LoadCapabilitiesForSelectionAsync(access.ServiceId, dto.CapabilityIds, activeOnly: true);

        foreach (var capability in capabilities)
        {
            await workflowRepo.UpsertWorkflowStepAsync(new UserServiceWorkflowStep
            {
                UserServiceId = userServiceId,
                ServiceId = access.ServiceId,
                ServiceWorkflowCapabilityId = capability.Id,
                Role = capability.Role,
                CapabilityType = capability.CapabilityType,
                IntegrationId = capability.IntegrationId,
                Status = WorkflowStepStatuses.Pending
            });
        }

        await workflowRepo.DisableWorkflowStepsExceptAsync(userServiceId, capabilities.Select(x => x.Id), WorkflowStepStatuses.Disabled);
        await SyncLegacyConfigAsync(userServiceId);
        return (await workflowRepo.GetWorkflowStepsByUserServiceIdAsync(userServiceId)).Select(ToDto);
    }

    public async Task<IEnumerable<UserServiceWorkflowStepDto>> ConfirmSelectionAsync(int callerUserId, bool isAdmin, bool isDeveloper, int userServiceId, WorkflowStepSelectionDto dto)
    {
        var access = await RequireAccessAsync(callerUserId, isAdmin, isDeveloper, userServiceId, allowClient: false, allowDeveloper: true);
        if (dto.CapabilityIds is null || dto.CapabilityIds.Length == 0)
            throw new ArgumentException("Select at least one workflow integration before confirming.");

        var capabilities = await LoadCapabilitiesForSelectionAsync(access.ServiceId, dto.CapabilityIds, activeOnly: true);
        var confirmedAt = DateTime.UtcNow;

        foreach (var capability in capabilities)
        {
            await workflowRepo.UpsertWorkflowStepAsync(new UserServiceWorkflowStep
            {
                UserServiceId = userServiceId,
                ServiceId = access.ServiceId,
                ServiceWorkflowCapabilityId = capability.Id,
                Role = capability.Role,
                CapabilityType = capability.CapabilityType,
                IntegrationId = capability.IntegrationId,
                Status = WorkflowStepStatuses.Confirmed,
                ConfirmedAt = confirmedAt,
                ConfirmedByUserId = callerUserId
            });
        }

        await workflowRepo.DisableWorkflowStepsExceptAsync(userServiceId, capabilities.Select(x => x.Id), WorkflowStepStatuses.Disabled);
        await SyncLegacyConfigAsync(userServiceId);
        return (await workflowRepo.GetWorkflowStepsByUserServiceIdAsync(userServiceId)).Select(ToDto);
    }

    public async Task<UserServiceWorkflowStepDto> UpdateWorkflowStepCredentialsAsync(int callerUserId, bool isAdmin, bool isDeveloper, int userServiceId, int workflowStepId, WorkflowCredentialUpdateDto dto)
    {
        _ = await RequireAccessAsync(callerUserId, isAdmin, isDeveloper, userServiceId, allowClient: true, allowDeveloper: true);
        var step = await workflowRepo.GetWorkflowStepByIdAsync(workflowStepId)
            ?? throw new KeyNotFoundException("Workflow step not found.");
        if (step.UserServiceId != userServiceId)
            throw new ArgumentException("Workflow step does not belong to this service.");
        if (step.IntegrationId is null || !step.RequiresCredentials)
            throw new ArgumentException("This workflow step does not require credentials.");

        var values = dto.Values ?? throw new ArgumentException("Credential values are required.");
        var schema = ParseObject(step.CredentialSchemaJson);
        ValidateCredentialValues(schema, values);

        var protectedValues = values.ToDictionary(pair => pair.Key, pair => protector.Protect(pair.Value), StringComparer.OrdinalIgnoreCase);
        step.CredentialValuesJson = JsonSerializer.Serialize(protectedValues);
        step = await workflowRepo.UpsertWorkflowStepAsync(step);
        await SyncLegacyConfigAsync(userServiceId);
        return ToDto(step);
    }

    public async Task<UserServiceCustomFormRecordDto?> GetCustomFormAsync(int callerUserId, bool isAdmin, bool isDeveloper, int userServiceId)
    {
        _ = await RequireAccessAsync(callerUserId, isAdmin, isDeveloper, userServiceId, allowClient: false, allowDeveloper: true);
        var form = await workflowRepo.GetCustomFormByUserServiceIdAsync(userServiceId);
        if (form is not null && form.IsActive) return ToCustomFormDto(form);

        var legacyContext = await integrations.GetCustomFormContextByUserServiceIdAsync(userServiceId);
        return ToLegacyCustomFormDto(legacyContext);
    }

    public async Task<UserServiceCustomFormRecordDto> UpsertCustomFormAsync(int callerUserId, bool isAdmin, bool isDeveloper, int userServiceId, UpsertDevUserServiceFormDto dto)
    {
        _ = await RequireAccessAsync(callerUserId, isAdmin, isDeveloper, userServiceId, allowClient: false, allowDeveloper: true);
        ValidateFormDto(dto);

        var steps = (await workflowRepo.GetWorkflowStepsByUserServiceIdAsync(userServiceId)).ToList();
        var formStep = steps.FirstOrDefault(step =>
            step.Status.Equals(WorkflowStepStatuses.Confirmed, StringComparison.OrdinalIgnoreCase) &&
            step.Role.Equals(WorkflowRoles.Trigger, StringComparison.OrdinalIgnoreCase) &&
            IsCustomFormCapability(step.CapabilityType));

        if (formStep is null)
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

        var form = await workflowRepo.UpsertCustomFormAsync(new UserServiceCustomForm
        {
            UserServiceId = userServiceId,
            WorkflowStepId = formStep.Id,
            FormSchemaJson = envelope,
            ProductionWebhookUrl = webhookUrl,
            IsActive = true
        });

        return ToCustomFormDto(form);
    }

    public async Task DeleteCustomFormAsync(int callerUserId, bool isAdmin, bool isDeveloper, int userServiceId)
    {
        _ = await RequireAccessAsync(callerUserId, isAdmin, isDeveloper, userServiceId, allowClient: false, allowDeveloper: true);
        await workflowRepo.DeleteCustomFormAsync(userServiceId);
    }

    private async Task ValidateCapabilityDtoAsync(UpsertServiceWorkflowCapabilityDto dto)
    {
        _ = await services.GetByIdAsync(dto.ServiceId) ?? throw new KeyNotFoundException("Service not found.");
        _ = NormalizeRole(dto.Role);

        if (dto.IntegrationId is not null)
        {
            var integration = await workflowRepo.GetIntegrationDefinitionByIdAsync(dto.IntegrationId.Value)
                ?? throw new ArgumentException("Linked integration was not found.");
            if (dto.RequiresCredentials && !integration.HasCredentials)
                throw new ArgumentException("RequiresCredentials cannot be true when the linked integration does not support credentials.");
        }
    }

    private async Task<UserServiceAccessContext> RequireAccessAsync(int callerUserId, bool isAdmin, bool isDeveloper, int userServiceId, bool allowClient, bool allowDeveloper)
    {
        var access = await workflowRepo.GetUserServiceAccessContextAsync(userServiceId)
            ?? throw new KeyNotFoundException("User service not found.");
        if (!access.UserServiceActive)
            throw new ArgumentException("User service is inactive.");
        if (isAdmin) return access;
        if (allowClient && access.OwnerUserId == callerUserId) return access;
        if (allowDeveloper && isDeveloper && access.AssignedDeveloperUserId == callerUserId) return access;
        throw new UnauthorizedAccessException("You do not have access to this user service.");
    }

    private async Task<List<ServiceWorkflowCapability>> LoadCapabilitiesForSelectionAsync(int serviceId, IEnumerable<int>? capabilityIds, bool activeOnly)
    {
        var ids = capabilityIds?.Distinct().ToArray() ?? [];
        if (ids.Length == 0) return [];

        var capabilities = (await workflowRepo.GetCapabilitiesByServiceAsync(serviceId, activeOnly))
            .Where(capability => ids.Contains(capability.Id))
            .ToList();

        if (capabilities.Count != ids.Length)
            throw new ArgumentException("One or more workflow capabilities are inactive, missing, or unrelated to this service.");
        return capabilities;
    }

    private async Task SyncLegacyConfigAsync(int userServiceId)
    {
        var userService = await userServices.GetByIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("User service not found.");

        var steps = (await workflowRepo.GetWorkflowStepsByUserServiceIdAsync(userServiceId))
            .Where(step => !step.Status.Equals(WorkflowStepStatuses.Disabled, StringComparison.OrdinalIgnoreCase))
            .ToList();

        var confirmed = steps.Where(step => step.Status.Equals(WorkflowStepStatuses.Confirmed, StringComparison.OrdinalIgnoreCase)).ToList();
        var config = new JsonObject
        {
            ["trigger"] = ToJsonArray(confirmed.Where(step => step.Role.Equals(WorkflowRoles.Trigger, StringComparison.OrdinalIgnoreCase)).Select(step => step.CapabilityName)),
            ["action"] = ToJsonArray(confirmed.Where(step => step.Role.Equals(WorkflowRoles.Action, StringComparison.OrdinalIgnoreCase)).Select(step => step.CapabilityName)),
            ["output"] = ToJsonArray(confirmed.Where(step => step.Role.Equals(WorkflowRoles.Output, StringComparison.OrdinalIgnoreCase)).Select(step => step.CapabilityName)),
            ["integrations"] = new JsonArray(steps.Select(step => new JsonObject
            {
                ["id"] = step.ServiceWorkflowCapabilityId,
                ["name"] = step.CapabilityName,
                ["confirmed"] = step.Status.Equals(WorkflowStepStatuses.Confirmed, StringComparison.OrdinalIgnoreCase),
                ["category"] = step.Role.ToLowerInvariant(),
                ["status"] = step.Status
            }).ToArray<JsonNode?>())
        };

        await userServices.UpdateConfigAsync(userServiceId, config.ToJsonString(), userService.Status);
    }

    private static WorkflowIntegrationDefinitionDto ToDto(WorkflowIntegrationDefinition definition) => new()
    {
        Id = definition.Id,
        Name = definition.Name,
        Description = definition.Description,
        IntegrationType = definition.IntegrationType,
        HasCredentials = definition.HasCredentials,
        CredentialFormSchema = ParseJson(definition.CredentialFormSchemaJson),
        IsActive = definition.IsActive,
        CreatedAt = definition.CreatedAt,
        UpdatedAt = definition.UpdatedAt
    };

    private static ServiceWorkflowCapabilityDto ToDto(ServiceWorkflowCapability capability) => new()
    {
        Id = capability.Id,
        ServiceId = capability.ServiceId,
        Role = capability.Role,
        CapabilityType = capability.CapabilityType,
        Name = capability.Name,
        Description = capability.Description,
        Price = capability.Price,
        DisplayOrder = capability.DisplayOrder,
        IsActive = capability.IsActive,
        IntegrationId = capability.IntegrationId,
        IntegrationName = capability.IntegrationName,
        RequiresCredentials = capability.RequiresCredentials,
        ConfigurationSchema = ParseJson(capability.ConfigurationSchemaJson),
        CreatedAt = capability.CreatedAt,
        UpdatedAt = capability.UpdatedAt
    };

    private UserServiceWorkflowStepDto ToDto(UserServiceWorkflowStep step) => new()
    {
        Id = step.Id,
        UserServiceId = step.UserServiceId,
        ServiceId = step.ServiceId,
        ServiceWorkflowCapabilityId = step.ServiceWorkflowCapabilityId,
        Role = step.Role,
        CapabilityType = step.CapabilityType,
        CapabilityName = step.CapabilityName,
        CapabilityDescription = step.CapabilityDescription,
        IntegrationId = step.IntegrationId,
        IntegrationName = step.IntegrationName,
        Status = step.Status,
        RequiresCredentials = step.RequiresCredentials,
        CapabilityIsActive = step.CapabilityIsActive,
        IntegrationIsActive = step.IntegrationId is null || step.IntegrationIsActive,
        Configuration = ParseJson(step.ConfigurationJson),
        ConfigurationSchema = ParseJson(step.ConfigurationSchemaJson),
        CredentialSchema = ParseJson(step.CredentialSchemaJson),
        CredentialFieldStates = BuildCredentialFieldStates(step.CredentialSchemaJson, step.CredentialValuesJson),
        ConfirmedAt = step.ConfirmedAt,
        ConfirmedByUserId = step.ConfirmedByUserId,
        CreatedAt = step.CreatedAt,
        UpdatedAt = step.UpdatedAt
    };

    private UserServiceCustomFormRecordDto ToCustomFormDto(UserServiceCustomForm form)
    {
        using var document = JsonDocument.Parse(form.FormSchemaJson);
        var root = document.RootElement;
        return new UserServiceCustomFormRecordDto
        {
            Id = form.Id,
            UserServiceId = form.UserServiceId,
            WorkflowStepId = form.WorkflowStepId,
            Label = root.TryGetProperty("label", out var label) ? label.GetString() ?? string.Empty : string.Empty,
            Description = root.TryGetProperty("description", out var description) ? description.GetString() : null,
            ResponseMode = root.TryGetProperty("responseMode", out var responseMode) ? NormalizeResponseMode(responseMode.GetString()) : "inline",
            PayloadTemplate = root.TryGetProperty("payloadTemplate", out var payload) ? payload.Clone() : JsonDocument.Parse("{}").RootElement.Clone(),
            Schema = root.TryGetProperty("schema", out var schema) ? schema.Clone() : JsonDocument.Parse("{\"elements\":[]}").RootElement.Clone(),
            SchemaVersion = root.TryGetProperty("schemaVersion", out var version) && version.TryGetInt32(out var parsedVersion) ? parsedVersion : 2,
            ProductionWebhookUrl = form.ProductionWebhookUrl,
            IsActive = form.IsActive,
            UpdatedAt = form.UpdatedAt
        };
    }

    private UserServiceCustomFormRecordDto? ToLegacyCustomFormDto(CustomFormAccessContextDto? context)
    {
        if (context is null) return null;

        var schemaJson = !string.IsNullOrWhiteSpace(context.PublishedSchemaJson)
            ? context.PublishedSchemaJson
            : context.DraftSchemaJson;
        if (string.IsNullOrWhiteSpace(schemaJson)) return null;

        using var document = JsonDocument.Parse(schemaJson);
        var root = document.RootElement;
        return new UserServiceCustomFormRecordDto
        {
            Id = 0,
            UserServiceId = context.UserServiceId,
            WorkflowStepId = 0,
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
            IsActive = true,
            UpdatedAt = context.PublishedAtUtc ?? DateTime.UtcNow
        };
    }

    private Dictionary<string, CredentialFieldStateDto>? BuildCredentialFieldStates(string? schemaJson, string? valuesJson)
    {
        var schema = ParseObject(schemaJson);
        if (!schema.TryGetPropertyValue("fields", out var fieldsNode) || fieldsNode is not JsonArray fields) return null;
        var protectedValues = ParseStringDictionary(valuesJson);
        var fieldStates = new Dictionary<string, CredentialFieldStateDto>(StringComparer.OrdinalIgnoreCase);

        foreach (var node in fields)
        {
            if (node is not JsonObject field) continue;
            var key = field["key"]?.GetValue<string>()?.Trim();
            if (string.IsNullOrWhiteSpace(key)) continue;
            var type = field["type"]?.GetValue<string>() ?? "text";
            var hasStored = protectedValues.ContainsKey(key);

            fieldStates[key] = new CredentialFieldStateDto
            {
                HasStoredValue = hasStored,
                DisplayValue = !hasStored ? null : SecretFieldTypes.Contains(type) ? "••••••••" : TryUnprotect(protectedValues[key])
            };
        }

        return fieldStates;
    }

    private void ValidateCredentialValues(JsonObject schema, IDictionary<string, string> values)
    {
        if (!schema.TryGetPropertyValue("fields", out var fieldsNode) || fieldsNode is not JsonArray fields || fields.Count == 0)
            throw new ArgumentException("The linked integration requires credentials but has no schema.");

        foreach (var node in fields)
        {
            if (node is not JsonObject field) continue;
            var key = field["key"]?.GetValue<string>()?.Trim();
            if (string.IsNullOrWhiteSpace(key)) continue;
            var type = (field["type"]?.GetValue<string>() ?? "text").Trim();
            var required = field["required"]?.GetValue<bool>() == true;
            values.TryGetValue(key, out var value);
            value = value?.Trim();

            if (required && string.IsNullOrWhiteSpace(value))
                throw new ArgumentException($"Credential field '{key}' is required.");
            if (string.IsNullOrWhiteSpace(value))
                continue;

            switch (type.ToLowerInvariant())
            {
                case "email":
                    if (!value.Contains('@'))
                        throw new ArgumentException($"Credential field '{key}' must be a valid email.");
                    break;
                case "number":
                    if (!decimal.TryParse(value, out _))
                        throw new ArgumentException($"Credential field '{key}' must be numeric.");
                    break;
                case "url":
                    if (!Uri.TryCreate(value, UriKind.Absolute, out _))
                        throw new ArgumentException($"Credential field '{key}' must be an absolute URL.");
                    break;
                case "select":
                    if (field["options"] is JsonArray options &&
                        !options.Any(option => string.Equals(option?["value"]?.GetValue<string>(), value, StringComparison.OrdinalIgnoreCase)))
                        throw new ArgumentException($"Credential field '{key}' contains an unsupported value.");
                    break;
                case "text":
                case "textarea":
                case "password":
                case "secret":
                case "hidden":
                    break;
                default:
                    throw new ArgumentException($"Credential field type '{type}' is not supported.");
            }
        }
    }

    private static void ValidateCredentialSchema(bool hasCredentials, string? schemaJson)
    {
        if (!hasCredentials) return;
        var schema = ParseObject(schemaJson);
        if (!schema.TryGetPropertyValue("fields", out var fieldsNode) || fieldsNode is not JsonArray fields || fields.Count == 0)
            throw new ArgumentException("Credential schema must include a non-empty fields array.");
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
        if (schema.TryGetProperty("meta", out var meta) &&
            meta.ValueKind == JsonValueKind.Object &&
            meta.TryGetProperty("productionWebhookUrl", out var nested) &&
            nested.ValueKind == JsonValueKind.String)
            return nested.GetString()?.Trim() ?? string.Empty;
        return string.Empty;
    }

    private static bool IsCustomFormCapability(string capabilityType) =>
        capabilityType.Equals("WebsiteForm", StringComparison.OrdinalIgnoreCase)
        || capabilityType.Equals("CustomForm", StringComparison.OrdinalIgnoreCase);

    private static string NormalizeRole(string? role)
    {
        var value = RequireValue(role, "Role is required.");
        if (!WorkflowRoles.Allowed.Contains(value))
            throw new ArgumentException("Role must be Trigger, Action, or Output.");
        return WorkflowRoles.Allowed.First(item => item.Equals(value, StringComparison.OrdinalIgnoreCase));
    }

    private static string NormalizeResponseMode(string? responseMode) =>
        string.IsNullOrWhiteSpace(responseMode) ? "inline" : responseMode.Trim().ToLowerInvariant();

    private static JsonArray ToJsonArray(IEnumerable<string> values) =>
        new(values.Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => JsonValue.Create(value.Trim())).ToArray<JsonNode?>());

    private static string RequireValue(string? value, string message) =>
        string.IsNullOrWhiteSpace(value) ? throw new ArgumentException(message) : value.Trim();

    private static string? TrimOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? SerializeOptionalObject(JsonElement? element, string errorMessage)
    {
        if (element is null || element.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            return null;
        if (element.Value.ValueKind != JsonValueKind.Object)
            throw new ArgumentException(errorMessage);
        return element.Value.GetRawText();
    }

    private static JsonElement? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }

    private static JsonObject ParseObject(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonNode.Parse(json) as JsonObject ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static Dictionary<string, string> ParseStringDictionary(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new(StringComparer.OrdinalIgnoreCase);
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new(StringComparer.OrdinalIgnoreCase);
        }
        catch
        {
            return new(StringComparer.OrdinalIgnoreCase);
        }
    }

    private string TryUnprotect(string value)
    {
        try
        {
            return protector.Unprotect(value);
        }
        catch
        {
            return "••••••••";
        }
    }
}
