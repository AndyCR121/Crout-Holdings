using System.ComponentModel.DataAnnotations;
namespace CroutApi.DTOs;
public record BookingCalendarSettingsDto(string Provider, string CalendarEmail, TimeSpan AvailabilityStart, TimeSpan AvailabilityEnd, string AvailableDays, string ConsultationPlatforms, DateTime? UpdatedAt);
public record UpdateBookingCalendarSettingsRequest(
    [Required] string Provider,
    [Required, EmailAddress] string CalendarEmail,
    [Required] string AvailabilityStart,
    [Required] string AvailabilityEnd,
    [Required] string AvailableDays,
    [Required] string ConsultationPlatforms);
