using CroutApi.DTOs;
using CroutApi.Repositories;
namespace CroutApi.Services;
public class BookingCalendarSettingsService(IBookingCalendarSettingsRepository settings) : IBookingCalendarSettingsService
{
    public Task<BookingCalendarSettingsDto?> GetAsync() => settings.GetAsync();
    public async Task<BookingCalendarSettingsDto> UpdateAsync(int adminUserId, UpdateBookingCalendarSettingsRequest request)
    {
        var provider = request.Provider.Trim().ToLowerInvariant();
        if (provider is not ("google" or "outlook")) throw new ArgumentException("Choose Google Calendar or Outlook Calendar.");
        if (!TimeOnly.TryParse(request.AvailabilityStart, out var availabilityStart) || !TimeOnly.TryParse(request.AvailabilityEnd, out var availabilityEnd) || availabilityEnd <= availabilityStart)
            throw new ArgumentException("Choose a valid consultation availability time range.");
        var days = request.AvailableDays.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(day => int.TryParse(day, out var value) ? value : -1).Distinct().Order().ToArray();
        if (days.Length == 0 || days.Any(day => day is < 0 or > 6)) throw new ArgumentException("Choose at least one valid consultation day.");
        var platforms = request.ConsultationPlatforms.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(platform => platform.Trim()).Where(platform => platform.Length is > 0 and <= 80).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        if (platforms.Length == 0) throw new ArgumentException("Add at least one consultation platform.");
        await settings.UpsertAsync(provider, request.CalendarEmail.Trim(), availabilityStart.ToString("HH:mm"), availabilityEnd.ToString("HH:mm"), string.Join(',', days), string.Join(',', platforms), adminUserId);
        return await settings.GetAsync() ?? throw new InvalidOperationException("Calendar settings could not be saved.");
    }
}
