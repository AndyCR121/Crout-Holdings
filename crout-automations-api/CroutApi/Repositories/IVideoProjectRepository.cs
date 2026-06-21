using CroutApi.Models;

namespace CroutApi.Repositories;

public interface IVideoProjectRepository
{
    Task<IEnumerable<VideoProject>> GetByUserAsync(int userId, int? companyId);
    Task<VideoProject?> GetByIdForUserAsync(int userId, int projectId);
    Task<int> SaveTimelineAsync(int userId, int projectId, string timelineJson, int? expectedVersion);
    Task<int> CreateRenderExecutionAsync(int userId, int projectId, string requestPayload, string responsePayload, string status, string mode);
}
