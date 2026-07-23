using CroutApi.Helpers;
using CroutApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Authorize]
public class ServiceTriggersController(IServiceTriggerService triggers) : ControllerBase
{
    private int UserId => JwtHelper.GetUserId(User);

    [HttpGet("api/companies/{companyId:int}/services/{serviceId:int}/triggers")]
    public async Task<IActionResult> GetConfigs(int companyId, int serviceId, [FromQuery] int? userServiceId = null) =>
        Ok(await triggers.GetConfigsAsync(UserId, companyId, serviceId, userServiceId));

    [HttpPost("api/service-triggers/{triggerId:int}/execute")]
    [RequestSizeLimit(60_000_000)]
    public async Task<IActionResult> Execute(int triggerId)
    {
        var companyId = 0;
        int? userServiceId = null;
        string? payloadJson = null;
        var fileNames = new List<string>();

        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync();
            companyId = int.Parse(form["companyId"]!);
            userServiceId = int.TryParse(form["userServiceId"], out var parsed) ? parsed : null;
            payloadJson = form["payload"];
            fileNames.AddRange(form.Files.Select(file => file.FileName));
        }
        else
        {
            using var body = await System.Text.Json.JsonDocument.ParseAsync(Request.Body);
            var root = body.RootElement;
            if (root.TryGetProperty("companyId", out var companyIdValue)
                && companyIdValue.TryGetInt32(out var parsedCompanyId))
            {
                companyId = parsedCompanyId;
            }
            if (root.TryGetProperty("userServiceId", out var userServiceIdValue)
                && userServiceIdValue.TryGetInt32(out var parsedUserServiceId))
            {
                userServiceId = parsedUserServiceId;
            }
            if (root.TryGetProperty("payload", out var payloadValue)
                && payloadValue.ValueKind is not System.Text.Json.JsonValueKind.Null)
            {
                payloadJson = payloadValue.GetRawText();
            }
        }

        if (companyId <= 0)
            return BadRequest(new { error = "companyId is required." });

        return Ok(await triggers.ExecuteAsync(UserId, triggerId, companyId, userServiceId, payloadJson, fileNames));
    }
}
