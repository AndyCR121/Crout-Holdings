using CroutApi.DTOs;
using CroutApi.Helpers;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace CroutApi.Controllers;
[ApiController, Route("api/admin/booking-calendar-settings"), Authorize]
public class BookingCalendarSettingsController(IBookingCalendarSettingsService settings) : ControllerBase
{
    private bool IsAdmin => string.Equals(User.FindFirst("is_admin")?.Value, "true", StringComparison.OrdinalIgnoreCase);
    [HttpGet] public async Task<IActionResult> Get() { if (!IsAdmin) return Forbid(); return Ok(await settings.GetAsync()); }
    [HttpPut] public async Task<IActionResult> Update([FromBody] UpdateBookingCalendarSettingsRequest request) { if (!IsAdmin) return Forbid(); return Ok(await settings.UpdateAsync(JwtHelper.GetUserId(User), request)); }
}
