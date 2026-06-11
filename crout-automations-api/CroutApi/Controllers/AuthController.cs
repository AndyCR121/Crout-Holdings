using CroutApi.DTOs.Auth;
using CroutApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService auth) : ControllerBase
{
    /// <summary>POST /api/auth/login</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await auth.LoginAsync(request);
        if (result is null) return Unauthorized(new { error = "Invalid identifier or password." });
        return Ok(result);
    }

    /// <summary>POST /api/auth/signup — primary endpoint used by the Angular frontend</summary>
    [HttpPost("signup")]
    public async Task<IActionResult> Signup([FromBody] RegisterRequest request)
    {
        try
        {
            var result = await auth.RegisterAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    /// <summary>POST /api/auth/register — kept as alias</summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var result = await auth.RegisterAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }
}
