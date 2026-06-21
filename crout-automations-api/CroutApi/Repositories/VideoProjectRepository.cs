using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class VideoProjectRepository(DbHelper db) : IVideoProjectRepository
{
    private const string SelectProject =
        "vp.video_project_id AS VideoProjectId, vp.company_id AS CompanyId, vp.user_service_id AS UserServiceId, vp.service_id AS ServiceId, " +
        "vp.Title, vp.Status, vp.scheduled_for AS ScheduledFor, vp.platform AS Platform, vp.output_url AS OutputUrl, " +
        "vp.metadata_json AS MetadataJson, vp.timeline_json AS TimelineJson, vp.timeline_version AS TimelineVersion, " +
        "vp.CreatedAt, vp.UpdatedAt";

    public async Task<IEnumerable<VideoProject>> GetByUserAsync(int userId, int? companyId)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<VideoProject>(
            $"""
            SELECT {SelectProject}
            FROM VideoProjects vp
            JOIN Companies c ON c.company_id = vp.company_id AND c.user_id = @userId AND c.Active = 1
            WHERE (@companyId IS NULL OR vp.company_id = @companyId)
            ORDER BY COALESCE(vp.scheduled_for, vp.CreatedAt) DESC
            """,
            new { userId, companyId });
    }

    public async Task<VideoProject?> GetByIdForUserAsync(int userId, int projectId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<VideoProject>(
            $"""
            SELECT {SelectProject}
            FROM VideoProjects vp
            JOIN Companies c ON c.company_id = vp.company_id AND c.user_id = @userId AND c.Active = 1
            WHERE vp.video_project_id = @projectId
            """,
            new { userId, projectId });
    }

    public async Task<int> SaveTimelineAsync(int userId, int projectId, string timelineJson, int? expectedVersion)
    {
        using var conn = db.GetConnection();
        var affected = await conn.ExecuteAsync(
            """
            UPDATE VideoProjects vp
            JOIN Companies c ON c.company_id = vp.company_id AND c.user_id = @userId AND c.Active = 1
            SET vp.timeline_json = @timelineJson,
                vp.timeline_version = vp.timeline_version + 1,
                vp.UpdatedAt = CURRENT_TIMESTAMP
            WHERE vp.video_project_id = @projectId
              AND (@expectedVersion IS NULL OR vp.timeline_version = @expectedVersion)
            """,
            new { userId, projectId, timelineJson, expectedVersion });
        return affected;
    }

    public async Task<int> CreateRenderExecutionAsync(int userId, int projectId, string requestPayload, string responsePayload, string status, string mode)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO ServiceTriggerExecutions
              (service_trigger_config_id, user_id, company_id, user_service_id, request_payload, response_payload, Status, mode)
            SELECT stc.service_trigger_config_id, @userId, vp.company_id, vp.user_service_id, @requestPayload, @responsePayload, @status, @mode
            FROM VideoProjects vp
            JOIN Companies c ON c.company_id = vp.company_id AND c.user_id = @userId AND c.Active = 1
            JOIN ServiceTriggerConfigs stc ON stc.service_id = vp.service_id AND stc.trigger_type = 'webhook' AND stc.is_active = 1
            WHERE vp.video_project_id = @projectId
            ORDER BY stc.sort_order, stc.service_trigger_config_id
            LIMIT 1;
            SELECT LAST_INSERT_ID();
            """,
            new { userId, projectId, requestPayload, responsePayload, status, mode });
    }
}
