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

    /// <summary>
    /// POST /api/auth/logout
    /// JWTs are stateless — invalidation happens client-side by clearing cookies.
    /// This endpoint exists so the frontend has a clean 200 to react to.
    /// For future token-blocklist support, add a revocation store here.
    /// </summary>
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        // Clear the JWT cookie server-side as well (belt-and-suspenders)
        Response.Cookies.Delete("ca_jwt", new Microsoft.AspNetCore.Http.CookieOptions
        {
            Path     = "/",
            SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax,
        });
        return Ok(new { message = "Logged out." });
    }

    [HttpPost("password-reset/request")]
    public async Task<IActionResult> RequestPasswordReset([FromBody] PasswordResetRequest request)
    {
        try
        {
            return Ok(await auth.RequestPasswordResetAsync(request));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("password-reset/resend")]
    public async Task<IActionResult> ResendPasswordReset([FromBody] PasswordResetResendRequest request)
    {
        try
        {
            return Ok(await auth.ResendPasswordResetAsync(request));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("password-reset/verify")]
    public async Task<IActionResult> VerifyPasswordResetOtp([FromBody] PasswordResetVerifyRequest request)
    {
        try
        {
            await auth.VerifyPasswordResetOtpAsync(request);
            return NoContent();
        }
        catch (Exception ex) when (ex is KeyNotFoundException or ArgumentException)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("password-reset/complete")]
    public async Task<IActionResult> CompletePasswordReset([FromBody] PasswordResetCompleteRequest request)
    {
        try
        {
            await auth.CompletePasswordResetAsync(request);
            return NoContent();
        }
        catch (Exception ex) when (ex is KeyNotFoundException or ArgumentException)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
