using CroutApi.DTOs;
using CroutApi.Helpers;
using Dapper;

namespace CroutApi.Repositories;

public class BookingRepository(DbHelper db) : IBookingRepository
{
    public async Task<bool> HasConflictAsync(DateTime startsAt, DateTime endsAt)
    {
        using var conn = db.GetConnection();
        const string sql = """
            SELECT COUNT(1) FROM (
              SELECT starts_at, ends_at FROM ConsultationBookings WHERE status = 'confirmed'
              UNION ALL SELECT starts_at, ends_at FROM BookingAvailabilityBlocks
            ) occupied WHERE starts_at < @endsAt AND ends_at > @startsAt
            """;
        return await conn.ExecuteScalarAsync<int>(sql, new { startsAt, endsAt }) > 0;
    }
    public async Task<int?> CreateBookingIfAvailableAsync(int userId, DateTime startsAt, DateTime endsAt, string platform)
    {
        using var conn = db.GetConnection();
        // A short advisory lock serializes the overlap check and insert across requests.
        if (await conn.ExecuteScalarAsync<int>("SELECT GET_LOCK('crout_consultation_booking', 5)") != 1)
            throw new InvalidOperationException("Could not reserve the booking calendar. Please try again.");
        try
        {
            if (await HasConflictAsync(startsAt, endsAt)) return null;
            return await conn.ExecuteScalarAsync<int>("INSERT INTO ConsultationBookings (user_id, starts_at, ends_at, consultation_platform) VALUES (@userId, @startsAt, @endsAt, @platform); SELECT LAST_INSERT_ID();", new { userId, startsAt, endsAt, platform });
        }
        finally { await conn.ExecuteAsync("SELECT RELEASE_LOCK('crout_consultation_booking')"); }
    }
    public async Task<bool> RescheduleBookingIfAvailableAsync(int bookingId, int userId, DateTime startsAt, DateTime endsAt, string platform)
    {
        using var conn = db.GetConnection();
        if (await conn.ExecuteScalarAsync<int>("SELECT GET_LOCK('crout_consultation_booking', 5)") != 1)
            throw new InvalidOperationException("Could not reserve the booking calendar. Please try again.");
        try
        {
            var owner = await conn.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM ConsultationBookings WHERE booking_id = @bookingId AND user_id = @userId AND status = 'confirmed'", new { bookingId, userId });
            if (owner == 0) throw new KeyNotFoundException("Consultation booking not found.");
            const string conflictSql = """
                SELECT COUNT(1) FROM (
                  SELECT starts_at, ends_at FROM ConsultationBookings WHERE status = 'confirmed' AND booking_id <> @bookingId
                  UNION ALL SELECT starts_at, ends_at FROM BookingAvailabilityBlocks
                ) occupied WHERE starts_at < @endsAt AND ends_at > @startsAt
                """;
            if (await conn.ExecuteScalarAsync<int>(conflictSql, new { bookingId, startsAt, endsAt }) > 0) return false;
            await conn.ExecuteAsync("UPDATE ConsultationBookings SET starts_at = @startsAt, ends_at = @endsAt, consultation_platform = @platform WHERE booking_id = @bookingId", new { bookingId, startsAt, endsAt, platform });
            return true;
        }
        finally { await conn.ExecuteAsync("SELECT RELEASE_LOCK('crout_consultation_booking')"); }
    }
    public async Task<BookingDto?> GetBookingAsync(int bookingId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<BookingDto>(SelectBookings + " WHERE b.booking_id = @bookingId", new { bookingId });
    }
    public async Task<IEnumerable<BookingDto>> GetBookingsAsync(DateTime from, DateTime to)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<BookingDto>(SelectBookings + " WHERE b.starts_at < @to AND b.ends_at > @from ORDER BY b.starts_at", new { from, to });
    }
    public async Task<IEnumerable<AvailabilityBlockDto>> GetBlocksAsync(DateTime from, DateTime to)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<AvailabilityBlockDto>("SELECT availability_block_id AS AvailabilityBlockId, starts_at AS StartsAt, ends_at AS EndsAt, note AS Note FROM BookingAvailabilityBlocks WHERE starts_at < @to AND ends_at > @from ORDER BY starts_at", new { from, to });
    }
    public async Task<int> CreateBlockAsync(DateTime startsAt, DateTime endsAt, string? note, int createdByUserId)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>("INSERT INTO BookingAvailabilityBlocks (starts_at, ends_at, note, created_by_user_id) VALUES (@startsAt, @endsAt, @note, @createdByUserId); SELECT LAST_INSERT_ID();", new { startsAt, endsAt, note, createdByUserId });
    }
    public async Task DeleteBlockAsync(int blockId) { using var conn = db.GetConnection(); await conn.ExecuteAsync("DELETE FROM BookingAvailabilityBlocks WHERE availability_block_id = @blockId", new { blockId }); }
    private const string SelectBookings = "SELECT b.booking_id AS BookingId, b.user_id AS UserId, CONCAT(u.FirstName, ' ', u.Surname) AS ClientName, u.Email AS ClientEmail, b.starts_at AS StartsAt, b.ends_at AS EndsAt, b.consultation_platform AS Platform, b.status AS Status FROM ConsultationBookings b INNER JOIN Users u ON u.user_id = b.user_id";
}
