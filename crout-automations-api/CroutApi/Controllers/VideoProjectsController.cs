using CroutApi.DTOs.VideoProjects;
using CroutApi.Helpers;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Authorize]
[Route("api/video-projects")]
public class VideoProjectsController(IVideoProjectService videos) : ControllerBase
{
    private int UserId => JwtHelper.GetUserId(User);

    [HttpGet]
    public async Task<IActionResult> GetProjects([FromQuery] int? companyId) =>
        Ok(await videos.GetProjectsAsync(UserId, companyId));

    [HttpGet("{projectId:int}")]
    public async Task<IActionResult> GetProject(int projectId) =>
        Ok(await videos.GetProjectAsync(UserId, projectId));

    [HttpPut("{projectId:int}/timeline")]
    public async Task<IActionResult> SaveTimeline(int projectId, SaveTimelineRequest request) =>
        Ok(await videos.SaveTimelineAsync(UserId, projectId, request));

    [HttpPost("{projectId:int}/render")]
    public async Task<IActionResult> Render(int projectId, RenderVideoProjectRequest request) =>
        Ok(await videos.RenderAsync(UserId, projectId, request));
}
