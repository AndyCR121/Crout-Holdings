using System.Text.Json;
using CroutApi.DTOs.VideoProjects;
using CroutApi.Models;
using CroutApi.Repositories;

namespace CroutApi.Services;

public class VideoProjectService(IVideoProjectRepository repo) : IVideoProjectService
{
    public async Task<IEnumerable<VideoProjectDto>> GetProjectsAsync(int userId, int? companyId)
    {
        var projects = await repo.GetByUserAsync(userId, companyId);
        return projects.Select(ToDto);
    }

    public async Task<VideoProjectDto> GetProjectAsync(int userId, int projectId)
    {
        var project = await repo.GetByIdForUserAsync(userId, projectId)
            ?? throw new KeyNotFoundException("Video project not found.");
        return ToDto(project);
    }

    public async Task<VideoProjectDto> SaveTimelineAsync(int userId, int projectId, SaveTimelineRequest request)
    {
        var affected = await repo.SaveTimelineAsync(userId, projectId, request.Timeline.GetRawText(), request.ExpectedVersion);
        if (affected == 0)
            throw new InvalidOperationException("Timeline was not saved. Reload the project and try again.");
        return await GetProjectAsync(userId, projectId);
    }

    public async Task<RenderVideoProjectResponse> RenderAsync(int userId, int projectId, RenderVideoProjectRequest request)
    {
        var project = await repo.GetByIdForUserAsync(userId, projectId)
            ?? throw new KeyNotFoundException("Video project not found.");

        var mode = HasLiveRenderConfig() ? "live" : "mock";
        var status = "queued";
        var requestPayload = JsonSerializer.Serialize(new
        {
            projectId,
            project.Title,
            project.TimelineVersion,
            notes = request.Notes
        });
        var responsePayload = JsonSerializer.Serialize(new
        {
            accepted = true,
            mode,
            message = mode == "mock"
                ? "Render queued locally because live video workflow environment values are not configured."
                : "Render queued for backend workflow execution."
        });
        var executionId = await repo.CreateRenderExecutionAsync(userId, projectId, requestPayload, responsePayload, status, mode);
        return new RenderVideoProjectResponse(
            executionId,
            status,
            mode,
            mode == "mock"
                ? "Render queued in mock mode. Configure backend video workflow environment values for live execution."
                : "Render queued.");
    }

    private static bool HasLiveRenderConfig() =>
        !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("N8N_BASE_URL")) &&
        !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("N8N_API_KEY"));

    private static VideoProjectDto ToDto(VideoProject project) => new(
        project.VideoProjectId,
        project.CompanyId,
        project.UserServiceId,
        project.ServiceId,
        project.Title,
        project.Status,
        project.ScheduledFor,
        project.Platform,
        project.OutputUrl,
        Parse(project.MetadataJson),
        Parse(project.TimelineJson),
        project.TimelineVersion,
        project.CreatedAt,
        project.UpdatedAt);

    private static JsonElement? Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }
}
