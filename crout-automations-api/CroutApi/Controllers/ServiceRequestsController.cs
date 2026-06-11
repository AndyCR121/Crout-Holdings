using System.Security.Claims;
using CroutApi.DTOs.Services;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Route("api/service-requests")]
[Authorize]
public class ServiceRequestsController(IServiceRequestService svcRequests) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>POST /api/service-requests</summary>
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitServiceRequestDto dto)
    {
        try
        {
            var result = await svcRequests.SubmitAsync(UserId, dto);
            return Created($"/api/service-requests/{result.RequestId}", result);
        }
        catch (KeyNotFoundException)        { return NotFound(new { error = "Company not found." }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
