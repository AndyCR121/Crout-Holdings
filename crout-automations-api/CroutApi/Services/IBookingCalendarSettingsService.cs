using CroutApi.DTOs;
namespace CroutApi.Services;
public interface IBookingCalendarSettingsService
{
    Task<BookingCalendarSettingsDto?> GetAsync();
    Task<BookingCalendarSettingsDto> UpdateAsync(int adminUserId, UpdateBookingCalendarSettingsRequest request);
}
