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

    /// <summary>POST /api/service-requests — submit a config change or new service request</summary>
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitServiceRequestDto dto)
    {
        try
        {
            var result = await svcRequests.SubmitAsync(UserId, dto);
            return Created($"/api/service-requests/{result.RequestId}", result);
        }
        catch (KeyNotFoundException ex)         { return NotFound(new { error = ex.Message }); }
        catch (UnauthorizedAccessException ex)  { return Forbid(); }
    }
}
