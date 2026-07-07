using CroutApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Route("api/release-notes")]
public class ReleaseNotesController(IReleaseNoteService releaseNotes) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok((await releaseNotes.GetAllPublicAsync()).Select(item => new
        {
            item.RefRelease,
            item.ReleaseVersion,
            item.ReleaseDate,
            item.ReleaseNotes
        }));
}
