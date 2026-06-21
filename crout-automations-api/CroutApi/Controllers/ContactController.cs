using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Route("api/contact")]
public class ContactController : ControllerBase
{
    [HttpPost("submit")]
    public IActionResult Submit(ContactRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { success = false, message = "Name, email, and message are required." });

        return Ok(new
        {
            success = true,
            mode = "mock",
            message = "Contact request accepted by the backend gateway."
        });
    }

    public sealed record ContactRequest(
        string Name,
        string Email,
        string? Phone,
        string? Business,
        string? Service,
        string Message,
        string? Source,
        string? Timestamp);
}
