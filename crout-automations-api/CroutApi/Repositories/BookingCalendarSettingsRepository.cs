using CroutApi.DTOs;
using CroutApi.Helpers;
using Dapper;
namespace CroutApi.Repositories;
public class BookingCalendarSettingsRepository(DbHelper db) : IBookingCalendarSettingsRepository
{
    public async Task<BookingCalendarSettingsDto?> GetAsync() { using var conn = db.GetConnection(); return await conn.QuerySingleOrDefaultAsync<BookingCalendarSettingsDto>("SELECT provider AS Provider, calendar_email AS CalendarEmail, availability_start AS AvailabilityStart, availability_end AS AvailabilityEnd, available_days AS AvailableDays, consultation_platforms AS ConsultationPlatforms, updated_at AS UpdatedAt FROM BookingCalendarSettings WHERE booking_calendar_settings_id = 1"); }
    public async Task UpsertAsync(string provider, string calendarEmail, string availabilityStart, string availabilityEnd, string availableDays, string consultationPlatforms, int updatedByUserId) { using var conn = db.GetConnection(); await conn.ExecuteAsync("INSERT INTO BookingCalendarSettings (booking_calendar_settings_id, provider, calendar_email, availability_start, availability_end, available_days, consultation_platforms, updated_by_user_id) VALUES (1, @provider, @calendarEmail, @availabilityStart, @availabilityEnd, @availableDays, @consultationPlatforms, @updatedByUserId) ON DUPLICATE KEY UPDATE provider = VALUES(provider), calendar_email = VALUES(calendar_email), availability_start = VALUES(availability_start), availability_end = VALUES(availability_end), available_days = VALUES(available_days), consultation_platforms = VALUES(consultation_platforms), updated_by_user_id = VALUES(updated_by_user_id)", new { provider, calendarEmail, availabilityStart, availabilityEnd, availableDays, consultationPlatforms, updatedByUserId }); }
}
