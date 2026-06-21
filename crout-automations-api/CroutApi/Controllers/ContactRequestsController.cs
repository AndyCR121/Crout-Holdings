using CroutApi.DTOs;
using CroutApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Route("api/contact-requests")]
public class ContactRequestsController(IContactRequestService contactRequests) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitContactRequestDto dto)
    {
        var result = await contactRequests.SubmitAsync(dto);
        return Accepted(result);
    }
}
