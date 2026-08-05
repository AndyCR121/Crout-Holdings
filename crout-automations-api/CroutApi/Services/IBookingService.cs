using CroutApi.DTOs;
namespace CroutApi.Services;
public interface IBookingService
{
    Task<BookingDto> CreateAsync(int userId, CreateBookingRequest request);
    Task<BookingDto> RescheduleAsync(int bookingId, int userId, CreateBookingRequest request);
    Task<BookingCalendarDto> GetCalendarAsync(DateTime from, DateTime to);
    Task<BookingCalendarDto> GetPublicCalendarAsync(DateTime from, DateTime to);
    Task<AvailabilityBlockDto> CreateBlockAsync(int adminId, CreateAvailabilityBlockRequest request);
    Task DeleteBlockAsync(int blockId);
}
