using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class PasswordResetRepository(DbHelper db) : IPasswordResetRepository
{
    public async Task CreateAsync(PasswordResetOtp otp)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            INSERT INTO PasswordResetOtps
            (reset_request_id, user_id, otp_hash, attempt_count, expires_at, verified_at, consumed_at, invalidated_at)
            VALUES
            (@ResetRequestId, @UserId, @OtpHash, @AttemptCount, @ExpiresAt, @VerifiedAt, @ConsumedAt, @InvalidatedAt)
            """,
            otp);
    }

    public async Task<PasswordResetOtp?> GetLatestByRequestIdAsync(string resetRequestId)
    {
        using var conn = db.GetConnection();
        var row = await conn.QuerySingleOrDefaultAsync(
            """
            SELECT
              password_reset_otp_id AS PasswordResetOtpId,
              reset_request_id AS ResetRequestId,
              user_id AS UserId,
              otp_hash AS OtpHash,
              attempt_count AS AttemptCount,
              expires_at AS ExpiresAt,
              verified_at AS VerifiedAt,
              consumed_at AS ConsumedAt,
              invalidated_at AS InvalidatedAt,
              created_at AS CreatedAt,
              updated_at AS UpdatedAt
            FROM PasswordResetOtps
            WHERE reset_request_id = @resetRequestId
            ORDER BY password_reset_otp_id DESC
            LIMIT 1
            """,
            new { resetRequestId });

        if (row is null) return null;

        return new PasswordResetOtp
        {
            PasswordResetOtpId = Convert.ToInt32(row.PasswordResetOtpId),
            ResetRequestId = row.ResetRequestId?.ToString() ?? string.Empty,
            UserId = Convert.ToInt32(row.UserId),
            OtpHash = row.OtpHash?.ToString() ?? string.Empty,
            AttemptCount = Convert.ToInt32(row.AttemptCount),
            ExpiresAt = Convert.ToDateTime(row.ExpiresAt),
            VerifiedAt = row.VerifiedAt is null ? null : Convert.ToDateTime(row.VerifiedAt),
            ConsumedAt = row.ConsumedAt is null ? null : Convert.ToDateTime(row.ConsumedAt),
            InvalidatedAt = row.InvalidatedAt is null ? null : Convert.ToDateTime(row.InvalidatedAt),
            CreatedAt = Convert.ToDateTime(row.CreatedAt),
            UpdatedAt = Convert.ToDateTime(row.UpdatedAt),
        };
    }

    public async Task InvalidateActiveByUserAsync(int userId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE PasswordResetOtps
            SET invalidated_at = COALESCE(invalidated_at, UTC_TIMESTAMP())
            WHERE user_id = @userId
              AND consumed_at IS NULL
              AND invalidated_at IS NULL
            """,
            new { userId });
    }

    public async Task IncrementAttemptCountAsync(int passwordResetOtpId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE PasswordResetOtps SET attempt_count = attempt_count + 1 WHERE password_reset_otp_id = @passwordResetOtpId",
            new { passwordResetOtpId });
    }

    public async Task MarkVerifiedAsync(int passwordResetOtpId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE PasswordResetOtps SET verified_at = COALESCE(verified_at, UTC_TIMESTAMP()) WHERE password_reset_otp_id = @passwordResetOtpId",
            new { passwordResetOtpId });
    }

    public async Task MarkInvalidatedAsync(int passwordResetOtpId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            "UPDATE PasswordResetOtps SET invalidated_at = COALESCE(invalidated_at, UTC_TIMESTAMP()) WHERE password_reset_otp_id = @passwordResetOtpId",
            new { passwordResetOtpId });
    }

    public async Task MarkConsumedByRequestIdAsync(string resetRequestId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE PasswordResetOtps
            SET consumed_at = COALESCE(consumed_at, UTC_TIMESTAMP()),
                invalidated_at = COALESCE(invalidated_at, UTC_TIMESTAMP())
            WHERE reset_request_id = @resetRequestId
            """,
            new { resetRequestId });
    }
}
