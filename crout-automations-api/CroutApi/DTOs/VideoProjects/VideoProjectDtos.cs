using System.Text.Json;

namespace CroutApi.DTOs.VideoProjects;

public record VideoProjectDto(
    int Id,
    int CompanyId,
    int? UserServiceId,
    int ServiceId,
    string Title,
    string Status,
    DateTime? ScheduledFor,
    string Platform,
    string? OutputUrl,
    JsonElement? Metadata,
    JsonElement? Timeline,
    int TimelineVersion,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record SaveTimelineRequest(JsonElement Timeline, int? ExpectedVersion);

public record RenderVideoProjectRequest(string? Notes);

public record RenderVideoProjectResponse(int ExecutionId, string Status, string Mode, string Message);
