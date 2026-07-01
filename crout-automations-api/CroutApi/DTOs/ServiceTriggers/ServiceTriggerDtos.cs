using System.Text.Json;

namespace CroutApi.DTOs.ServiceTriggers;

public record ServiceTriggerConfigDto(
    int Id,
    int ServiceId,
    int? UserServiceId,
    string? WorkflowId,
    string TriggerType,
    string Label,
    string? Description,
    string Method,
    bool RequiresConfirmation,
    JsonElement? PayloadTemplate,
    JsonElement? Fields,
    JsonElement? FileUpload,
    string ResponseMode,
    JsonElement? FormSchema = null,
    string? ActiveTabId = null);

public record ExecuteTriggerResponseDto(
    int ExecutionId,
    string Status,
    string Mode,
    string Message,
    JsonElement? Response);

