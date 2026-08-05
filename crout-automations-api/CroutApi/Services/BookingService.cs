using CroutApi.DTOs;
using CroutApi.Repositories;

namespace CroutApi.Services;
public class BookingService(IBookingRepository bookings, IEmailService email) : IBookingService
{
    private static readonly TimeSpan ConsultationLength = TimeSpan.FromMinutes(30);
    public async Task<BookingDto> CreateAsync(int userId, CreateBookingRequest request)
    {
        var start = DateTime.SpecifyKind(request.StartsAt, DateTimeKind.Utc);
        var end = start.Add(ConsultationLength);
        if (start < DateTime.UtcNow.AddMinutes(5)) throw new ArgumentException("Please choose a future consultation time.");
        if (start.Minute is not (0 or 30) || start.Second != 0) throw new ArgumentException("Please select an available 30-minute time slot.");
        var id = await bookings.CreateBookingIfAvailableAsync(userId, start, end)
            ?? throw new ArgumentException("That time was just booked or is no longer available. Please choose another slot.");
        var booking = await bookings.GetBookingAsync(id) ?? throw new InvalidOperationException("Booking could not be loaded.");
        _ = email.SendBookingConfirmationAsync(booking);
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
}
