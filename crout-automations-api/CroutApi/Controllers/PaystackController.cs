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

    /// <summary>GET /api/paystack/companies — list user's companies with their saved cards</summary>
    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanyBilling()
    {
        var result = await paystack.GetCompanyBillingAsync(UserId);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/paystack/manage-card-url
    /// Body: { "companyId": 3 }
    /// </summary>
    [HttpPost("manage-card-url")]
    public async Task<IActionResult> ManageCardUrl([FromBody] ManageCardRequest req)
    {
        var result = await paystack.InitialiseCardCaptureAsync(UserId, req.CompanyId);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/paystack/verify
    /// Body: { "reference": "abc123" }
    /// Called immediately after the Paystack popup fires onSuccess.
    /// Verifies the transaction server-side so Paystack commits the
    /// authorization to the customer record — this is what makes the
    /// card appear on GET /customer/{email}.
    /// </summary>
    [HttpPost("verify")]
    public async Task<IActionResult> VerifyTransaction([FromBody] VerifyRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Reference))
            return BadRequest(new { message = "Reference is required." });

        var result = await paystack.VerifyTransactionAsync(req.Reference);
        return Ok(result);
    }
}

public record ManageCardRequest(int CompanyId);
public record VerifyRequest(string Reference);
