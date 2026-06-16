using CroutApi.Helpers;
using CroutApi.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(IUserRepository users) : ControllerBase
{
    private int CallerUserId => JwtHelper.GetUserId(User);
    private bool IsAdmin     => User.IsInRole("admin");

    /// <summary>
    /// GET /api/users/{id}
    /// Returns the full user profile for the given ID.
    /// A user can only fetch their own record; admins may fetch any.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        // Non-admins may only read their own profile
        if (!IsAdmin && CallerUserId != id)
            return Forbid();

        var user = await users.GetByIdAsync(id);
        if (user is null) return NotFound(new { error = "User not found." });

        return Ok(new
        {
            userId         = user.UserId,
            username       = user.Username,
            firstName      = user.FirstName,
            surname        = user.Surname,
            email          = user.Email,
            cellNumber     = user.CellNumber,
            active         = user.Active,
            isAdmin        = user.IsAdmin,
            profilePicture = user.ProfilePicture,
        });
    }
}
