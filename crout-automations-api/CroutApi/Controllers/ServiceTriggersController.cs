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
            var body = await System.Text.Json.JsonSerializer.DeserializeAsync<ExecuteTriggerBody>(Request.Body);
            companyId = body?.CompanyId ?? 0;
            userServiceId = body?.UserServiceId;
            payloadJson = body?.Payload.GetRawText();
        }

        if (companyId <= 0)
            return BadRequest(new { error = "companyId is required." });

        return Ok(await triggers.ExecuteAsync(UserId, triggerId, companyId, userServiceId, payloadJson, fileNames));
    }

    private sealed record ExecuteTriggerBody(int CompanyId, int? UserServiceId, System.Text.Json.JsonElement Payload);
}
