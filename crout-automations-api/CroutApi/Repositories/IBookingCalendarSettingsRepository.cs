using CroutApi.DTOs;
namespace CroutApi.Repositories;
public interface IBookingCalendarSettingsRepository
{
    Task<BookingCalendarSettingsDto?> GetAsync();
    Task UpsertAsync(string provider, string calendarEmail, string availabilityStart, string availabilityEnd, string availableDays, string consultationPlatforms, int updatedByUserId);
}
