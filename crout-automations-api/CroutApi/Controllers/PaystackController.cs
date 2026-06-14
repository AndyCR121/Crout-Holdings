using CroutApi.Helpers;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Route("api/paystack")]
[Authorize]
public class PaystackController(IPaystackProxyService paystack) : ControllerBase
{
    private int UserId => JwtHelper.GetUserId(User);

    /// <summary>GET /api/paystack/subscriptions</summary>
    [HttpGet("subscriptions")]
    public async Task<IActionResult> GetSubscriptions()
    {
        var result = await paystack.GetSubscriptionsAsync(UserId);
        return Ok(result);
    }

    /// <summary>GET /api/paystack/cards</summary>
    [HttpGet("cards")]
    public async Task<IActionResult> GetCards()
    {
        var result = await paystack.GetCardsAsync(UserId);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/paystack/manage-card-url
    /// Initialises a Paystack transaction for card capture.
    /// Returns { access_code, reference } for the frontend popup embed.
    /// </summary>
    [HttpPost("manage-card-url")]
    public async Task<IActionResult> ManageCardUrl()
    {
        var result = await paystack.InitialiseCardCaptureAsync(UserId);
        return Ok(result);
    }
}
