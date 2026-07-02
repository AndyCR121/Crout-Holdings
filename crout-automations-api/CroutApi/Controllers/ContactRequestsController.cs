using CroutApi.DTOs;
using CroutApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Route("api/contact-requests")]
public class ContactRequestsController(
    IContactRequestService contactRequests,
    ILogger<ContactRequestsController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitContactRequestDto dto)
    {
        logger.LogInformation(
            "Contact request received for service {Service} from source {Source}.",
            dto.Service,
            dto.Source ?? "unknown");

        var result = await contactRequests.SubmitAsync(dto);

        if (!result.EmailSent)
        {
            logger.LogWarning(
                "Contact request {RequestId} stored but email delivery failed.",
                result.RequestId);

            return StatusCode(StatusCodes.Status503ServiceUnavailable, result);
        }

        logger.LogInformation(
            "Contact request {RequestId} accepted and email delivered.",
            result.RequestId);

        return Accepted(result);
    }
}
