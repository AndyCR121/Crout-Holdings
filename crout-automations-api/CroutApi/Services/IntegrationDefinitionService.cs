using System.Text.Json;
using CroutApi.DTOs;
using CroutApi.Models;
using CroutApi.Repositories;

namespace CroutApi.Services;

public class IntegrationDefinitionService(
    IIntegrationDefinitionRepository definitions) : IIntegrationDefinitionService
{
    public async Task<IEnumerable<IntegrationDefinitionDto>> GetAllAsync(bool activeOnly) =>
        (await definitions.GetAllAsync(activeOnly)).Select(ToDto);

    public async Task<IntegrationDefinitionDto> CreateAsync(UpsertIntegrationDefinitionDto dto)
    {
        var definition = new IntegrationDefinition
        {
            Name = RequireValue(dto.Name, "Integration name is required."),
            Description = TrimOrNull(dto.Description),
            IntegrationType = RequireValue(dto.IntegrationType, "Integration type is required."),
            HasCredentials = dto.HasCredentials,
            CredentialFormSchemaJson = SerializeOptionalObject(dto.CredentialFormSchema, "Credential form schema must be a JSON object."),
            IsActive = dto.IsActive
        };

        ValidateCredentialSchema(definition.HasCredentials, definition.CredentialFormSchemaJson);
        definition.Id = await definitions.CreateAsync(definition);
        return ToDto((await definitions.GetByIdAsync(definition.Id))!);
    }

    public async Task<IntegrationDefinitionDto> UpdateAsync(int integrationId, UpsertIntegrationDefinitionDto dto)
    {
        var current = await definitions.GetByIdAsync(integrationId)
            ?? throw new KeyNotFoundException("Integration definition not found.");

        current.Name = RequireValue(dto.Name, "Integration name is required.");
        current.Description = TrimOrNull(dto.Description);
        current.IntegrationType = RequireValue(dto.IntegrationType, "Integration type is required.");
        current.HasCredentials = dto.HasCredentials;
        current.CredentialFormSchemaJson = SerializeOptionalObject(dto.CredentialFormSchema, "Credential form schema must be a JSON object.");
        current.IsActive = dto.IsActive;

        ValidateCredentialSchema(current.HasCredentials, current.CredentialFormSchemaJson);
        await definitions.UpdateAsync(current);
        return ToDto((await definitions.GetByIdAsync(integrationId))!);
    }

    public async Task DeleteAsync(int integrationId)
    {
        _ = await definitions.GetByIdAsync(integrationId)
            ?? throw new KeyNotFoundException("Integration definition not found.");
        await definitions.DeleteAsync(integrationId);
    }

    private static IntegrationDefinitionDto ToDto(IntegrationDefinition definition) => new()
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

    private static void ValidateCredentialSchema(bool hasCredentials, string? schemaJson)
    {
        if (!hasCredentials) return;
        if (string.IsNullOrWhiteSpace(schemaJson))
            throw new ArgumentException("Credential schema must include a non-empty fields array.");

        using var document = JsonDocument.Parse(schemaJson);
        if (!document.RootElement.TryGetProperty("fields", out var fields) || fields.ValueKind != JsonValueKind.Array || fields.GetArrayLength() == 0)
            throw new ArgumentException("Credential schema must include a non-empty fields array.");
    }

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
}
