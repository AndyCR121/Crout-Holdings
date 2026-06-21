using CroutApi.DTOs.VideoProjects;

namespace CroutApi.Services;

public interface IVideoProjectService
{
    Task<IEnumerable<VideoProjectDto>> GetProjectsAsync(int userId, int? companyId);
    Task<VideoProjectDto> GetProjectAsync(int userId, int projectId);
    Task<VideoProjectDto> SaveTimelineAsync(int userId, int projectId, SaveTimelineRequest request);
    Task<RenderVideoProjectResponse> RenderAsync(int userId, int projectId, RenderVideoProjectRequest request);
}
