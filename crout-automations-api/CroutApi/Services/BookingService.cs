using CroutApi.DTOs;
using CroutApi.Repositories;

namespace CroutApi.Services;
public class BookingService(IBookingRepository bookings, IBookingCalendarSettingsRepository calendarSettings, IEmailService email) : IBookingService
{
    private static readonly TimeSpan ConsultationLength = TimeSpan.FromMinutes(30);
    public async Task<BookingDto> CreateAsync(int userId, CreateBookingRequest request)
    {
        var start = DateTime.SpecifyKind(request.StartsAt, DateTimeKind.Utc);
        var end = start.Add(ConsultationLength);
        var platform = await ValidateSlotAsync(start, end, request.Platform);
        var id = await bookings.CreateBookingIfAvailableAsync(userId, start, end, platform)
            ?? throw new ArgumentException("That time was just booked or is no longer available. Please choose another slot.");
        var booking = await bookings.GetBookingAsync(id) ?? throw new InvalidOperationException("Booking could not be loaded.");
        var settings = await calendarSettings.GetAsync();
        _ = email.SendBookingConfirmationAsync(booking, settings?.CalendarEmail);
        return booking;
    }
    public async Task<BookingDto> RescheduleAsync(int bookingId, int userId, CreateBookingRequest request)
    {
        var start = DateTime.SpecifyKind(request.StartsAt, DateTimeKind.Utc); var end = start.Add(ConsultationLength);
        var platform = await ValidateSlotAsync(start, end, request.Platform);
        if (!await bookings.RescheduleBookingIfAvailableAsync(bookingId, userId, start, end, platform)) throw new ArgumentException("That time was just booked or is no longer available. Please choose another slot.");
        var booking = await bookings.GetBookingAsync(bookingId) ?? throw new KeyNotFoundException("Consultation booking not found.");
        var settings = await calendarSettings.GetAsync(); _ = email.SendBookingConfirmationAsync(booking, settings?.CalendarEmail);
        return booking;
    }
    public async Task<BookingCalendarDto> GetCalendarAsync(DateTime from, DateTime to) => new(await bookings.GetBookingsAsync(from, to), await bookings.GetBlocksAsync(from, to));
    public async Task<BookingCalendarDto> GetPublicCalendarAsync(DateTime from, DateTime to)
    {
        var confirmed = await bookings.GetBookingsAsync(from, to);
        // Do not expose customer identities or private block notes from the public availability feed.
        return new BookingCalendarDto(confirmed.Select(b => b with { UserId = 0, ClientName = string.Empty, ClientEmail = string.Empty }), await bookings.GetBlocksAsync(from, to));
    }
    public async Task<AvailabilityBlockDto> CreateBlockAsync(int adminId, CreateAvailabilityBlockRequest request)
    {
        var start = DateTime.SpecifyKind(request.StartsAt, DateTimeKind.Utc); var end = DateTime.SpecifyKind(request.EndsAt, DateTimeKind.Utc);
        if (end <= start) throw new ArgumentException("The unavailable period must end after it starts.");
        var id = await bookings.CreateBlockAsync(start, end, request.Note?.Trim(), adminId);
        return (await bookings.GetBlocksAsync(start, end)).Single(x => x.AvailabilityBlockId == id);
    }
    public Task DeleteBlockAsync(int blockId) => bookings.DeleteBlockAsync(blockId);

    private async Task<string> ValidateSlotAsync(DateTime start, DateTime end, string? requestedPlatform)
    {
        if (start < DateTime.UtcNow.AddMinutes(5)) throw new ArgumentException("Please choose a future consultation time.");
        if (start.Minute is not (0 or 30) || start.Second != 0) throw new ArgumentException("Please select an available 30-minute time slot.");
        var settings = await calendarSettings.GetAsync();
        var availabilityStart = TimeOnly.FromTimeSpan(settings?.AvailabilityStart ?? TimeSpan.FromHours(8));
        var availabilityEnd = TimeOnly.FromTimeSpan(settings?.AvailabilityEnd ?? TimeSpan.FromHours(16));
        var availableDays = (settings?.AvailableDays ?? "1,2,3,4,5").Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToHashSet();
        var localStart = TimeZoneInfo.ConvertTimeFromUtc(start, GetSouthAfricaTimeZone());
        var localEnd = TimeZoneInfo.ConvertTimeFromUtc(end, GetSouthAfricaTimeZone());
        if (!availableDays.Contains((int)localStart.DayOfWeek) || TimeOnly.FromDateTime(localStart) < availabilityStart || TimeOnly.FromDateTime(localEnd) > availabilityEnd)
            throw new ArgumentException("That time is outside the configured consultation availability.");
        var platforms = (settings?.ConsultationPlatforms ?? "Teams,Slack,Discord").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var platform = requestedPlatform?.Trim();
        if (string.IsNullOrWhiteSpace(platform) || !platforms.Contains(platform, StringComparer.OrdinalIgnoreCase)) throw new ArgumentException("Please choose one of the available consultation platforms.");
        return platforms.First(value => string.Equals(value, platform, StringComparison.OrdinalIgnoreCase));
    }

    private static TimeZoneInfo GetSouthAfricaTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("South Africa Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("Africa/Johannesburg"); }
    }
}
