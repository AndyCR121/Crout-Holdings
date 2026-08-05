using CroutApi.DTOs;
using CroutApi.Helpers;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;
[ApiController, Route("api/bookings")]
public class BookingsController(IBookingService bookings, IBookingCalendarSettingsService calendarSettings) : ControllerBase
{
    private bool IsAdmin => string.Equals(User.FindFirst("is_admin")?.Value, "true", StringComparison.OrdinalIgnoreCase);
    [HttpGet("calendar"), AllowAnonymous]
    public async Task<IActionResult> Calendar([FromQuery] DateTime from, [FromQuery] DateTime to) => Ok(await bookings.GetPublicCalendarAsync(from, to));
    [HttpGet("availability-settings"), AllowAnonymous]
    public async Task<IActionResult> AvailabilitySettings()
    {
        var settings = await calendarSettings.GetAsync();
        return Ok(new { availabilityStart = (settings?.AvailabilityStart ?? TimeSpan.FromHours(8)).ToString(@"hh\:mm"), availabilityEnd = (settings?.AvailabilityEnd ?? TimeSpan.FromHours(16)).ToString(@"hh\:mm"), availableDays = settings?.AvailableDays ?? "1,2,3,4,5", consultationPlatforms = settings?.ConsultationPlatforms ?? "Teams,Slack,Discord" });
    }
    [HttpGet("calendar/admin"), Authorize]
    public async Task<IActionResult> AdminCalendar([FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        if (!IsAdmin) return Forbid();
        return Ok(await bookings.GetCalendarAsync(from, to));
    }
    [HttpPost, Authorize]
    public async Task<IActionResult> Create([FromBody] CreateBookingRequest request) => Ok(await bookings.CreateAsync(JwtHelper.GetUserId(User), request));
    [HttpPut("{bookingId:int}"), Authorize]
    public async Task<IActionResult> Reschedule(int bookingId, [FromBody] CreateBookingRequest request) => Ok(await bookings.RescheduleAsync(bookingId, JwtHelper.GetUserId(User), request));
    [HttpPost("availability-blocks"), Authorize]
    public async Task<IActionResult> CreateBlock([FromBody] CreateAvailabilityBlockRequest request)
    {
        if (!IsAdmin) return Forbid();
        return Ok(await bookings.CreateBlockAsync(JwtHelper.GetUserId(User), request));
    }
    [HttpDelete("availability-blocks/{blockId:int}"), Authorize]
    public async Task<IActionResult> DeleteBlock(int blockId)
    {
        if (!IsAdmin) return Forbid();
        await bookings.DeleteBlockAsync(blockId); return NoContent();
    }
}
