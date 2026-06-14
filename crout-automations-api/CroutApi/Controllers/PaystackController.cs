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

    /// <summary>GET /api/paystack/subscriptions — all subscriptions across all user's companies</summary>
    [HttpGet("subscriptions")]
    public async Task<IActionResult> GetSubscriptions()
    {
        var result = await paystack.GetSubscriptionsAsync(UserId);
        return Ok(result);
    }

    /// <summary>GET /api/paystack/companies — list user's companies with their Paystack cards</summary>
    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanyBilling()
    {
        var result = await paystack.GetCompanyBillingAsync(UserId);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/paystack/manage-card-url
    /// Body: { "companyId": 3 }
    /// Initialises a Paystack transaction for card capture using the company's email.
    /// Returns { access_code, reference, email } for the frontend popup.
    /// </summary>
    [HttpPost("manage-card-url")]
    public async Task<IActionResult> ManageCardUrl([FromBody] ManageCardRequest req)
    {
        var result = await paystack.InitialiseCardCaptureAsync(UserId, req.CompanyId);
        return Ok(result);
    }
}

public record ManageCardRequest(int CompanyId);
