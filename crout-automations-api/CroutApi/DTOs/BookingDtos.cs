using System.ComponentModel.DataAnnotations;

namespace CroutApi.DTOs;

public record CreateBookingRequest([Required] DateTime StartsAt, [Required] string Platform);
public record CreateAvailabilityBlockRequest([Required] DateTime StartsAt, [Required] DateTime EndsAt, string? Note);
public record BookingDto(int BookingId, int UserId, string ClientName, string ClientEmail, DateTime StartsAt, DateTime EndsAt, string Platform, string Status);
public record AvailabilityBlockDto(int AvailabilityBlockId, DateTime StartsAt, DateTime EndsAt, string? Note);
public record BookingCalendarDto(IEnumerable<BookingDto> Bookings, IEnumerable<AvailabilityBlockDto> Blocks);
