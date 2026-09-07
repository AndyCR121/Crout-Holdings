using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class CustomFormShareLinkRepository(DbHelper db) : ICustomFormShareLinkRepository
{
    private const string SelectLink =
        "share_link_id AS ShareLinkId, user_service_id AS UserServiceId, created_by_user_id AS CreatedByUserId, " +
        "token_hash AS TokenHash, created_at AS CreatedAt, expires_at AS ExpiresAt, revoked_at AS RevokedAt";

    public async Task<CustomFormShareLink?> GetActiveByUserServiceIdAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<CustomFormShareLink>(
            $"""
            SELECT {SelectLink}
            FROM CustomFormShareLinks
            WHERE user_service_id = @userServiceId
              AND revoked_at IS NULL
              AND expires_at > UTC_TIMESTAMP()
            ORDER BY created_at DESC
            LIMIT 1
            """,
            new { userServiceId });
    }

    public async Task<CustomFormShareLink?> GetActiveByTokenHashAsync(string tokenHash)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<CustomFormShareLink>(
            $"""
            SELECT {SelectLink}
            FROM CustomFormShareLinks
            WHERE token_hash = @tokenHash
              AND revoked_at IS NULL
              AND expires_at > UTC_TIMESTAMP()
            LIMIT 1
            """,
            new { tokenHash });
    }

    public async Task<int> CreateAsync(CustomFormShareLink link)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO CustomFormShareLinks
              (user_service_id, created_by_user_id, token_hash, created_at, expires_at)
            VALUES
              (@UserServiceId, @CreatedByUserId, @TokenHash, @CreatedAt, @ExpiresAt);
            SELECT LAST_INSERT_ID();
            """,
            link);
    }

    public async Task RevokeActiveByUserServiceIdAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE CustomFormShareLinks
            SET revoked_at = UTC_TIMESTAMP()
            WHERE user_service_id = @userServiceId
              AND revoked_at IS NULL
            """,
            new { userServiceId });
    }

    public async Task<int> CreateAccessAsync(CustomFormShareLinkAccess access)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO CustomFormShareLinkAccesses
              (share_link_id, accessed_at, action, service_trigger_execution_id)
            VALUES
              (@ShareLinkId, UTC_TIMESTAMP(), @Action, @ServiceTriggerExecutionId);
            SELECT LAST_INSERT_ID();
            """,
            access);
    }

    public async Task<(DateTime? LastUsedAtUtc, int SubmissionCount)> GetUsageAsync(int shareLinkId)
    {
        using var conn = db.GetConnection();
        var row = await conn.QuerySingleOrDefaultAsync<(DateTime? LastUsedAtUtc, int SubmissionCount)>(
            """
            SELECT
              MAX(accessed_at) AS LastUsedAtUtc,
              SUM(CASE WHEN action = 'submit' THEN 1 ELSE 0 END) AS SubmissionCount
            FROM CustomFormShareLinkAccesses
            WHERE share_link_id = @shareLinkId
            """,
            new { shareLinkId });
        return row;
    }
}
