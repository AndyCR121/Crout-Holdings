using CroutApi.DTOs;

namespace CroutApi.Repositories;

public interface IBookingRepository
{
    Task<bool> HasConflictAsync(DateTime startsAt, DateTime endsAt);
    Task<int?> CreateBookingIfAvailableAsync(int userId, DateTime startsAt, DateTime endsAt);
    Task<BookingDto?> GetBookingAsync(int bookingId);
    Task<IEnumerable<BookingDto>> GetBookingsAsync(DateTime from, DateTime to);
    Task<IEnumerable<AvailabilityBlockDto>> GetBlocksAsync(DateTime from, DateTime to);
    Task<int> CreateBlockAsync(DateTime startsAt, DateTime endsAt, string? note, int createdByUserId);
    Task DeleteBlockAsync(int blockId);
}
