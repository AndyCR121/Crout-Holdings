using System.Security.Claims;
using CroutApi.DTOs;
using CroutApi.Helpers;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/release-notes")]
public class AdminReleaseNotesController(IReleaseNoteService releaseNotes) : ControllerBase
{
    private bool IsAdmin =>
        string.Equals(
            User.FindFirstValue("is_admin"),
            "true",
            StringComparison.OrdinalIgnoreCase);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] ReleaseNoteListQueryDto query)
    {
        if (!IsAdmin) return Forbid();
        var result = await releaseNotes.GetPagedAsync(query.Page, query.PageSize, query.SortBy, query.SortDirection);
        return Ok(new { items = result.Items, total = result.Total, page = result.Page, pageSize = result.PageSize });
    }

    [HttpGet("{refRelease:int}")]
    public async Task<IActionResult> GetById(int refRelease)
    {
        if (!IsAdmin) return Forbid();
        var item = await releaseNotes.GetByIdAsync(refRelease);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ReleaseNoteUpsertDto dto)
    {
        if (!IsAdmin) return Forbid();

        try
        {
            var created = await releaseNotes.CreateAsync(dto.ReleaseVersion, dto.ReleaseDate, dto.ReleaseNotes);
            return CreatedAtAction(nameof(GetById), new { refRelease = created.RefRelease }, created);
        }
        catch (DuplicateReleaseVersionException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpPut("{refRelease:int}")]
    public async Task<IActionResult> Update(int refRelease, [FromBody] ReleaseNoteUpsertDto dto)
    {
        if (!IsAdmin) return Forbid();

        try
        {
            return Ok(await releaseNotes.UpdateAsync(refRelease, dto.ReleaseVersion, dto.ReleaseDate, dto.ReleaseNotes));
        }
        catch (DuplicateReleaseVersionException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpDelete("{refRelease:int}")]
    public async Task<IActionResult> Delete(int refRelease)
    {
        if (!IsAdmin) return Forbid();
        await releaseNotes.DeleteAsync(refRelease);
        return NoContent();
    }
}
