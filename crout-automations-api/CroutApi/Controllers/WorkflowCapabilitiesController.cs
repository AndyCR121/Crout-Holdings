using System.Security.Claims;
using CroutApi.Helpers;
using CroutApi.Services;
using CroutApi.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CroutApi.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class WorkflowCapabilitiesController(IWorkflowCapabilityService workflow, IIntegrationService integrations) : ControllerBase
{
    private int CallerId => JwtHelper.GetUserId(User);
    private bool IsAdmin =>
        string.Equals(
            User.FindFirstValue("is_admin"),
            "true",
            StringComparison.OrdinalIgnoreCase);
    private bool IsDeveloper =>
        string.Equals(
            User.FindFirstValue("is_dev"),
            "true",
            StringComparison.OrdinalIgnoreCase);

    [HttpGet("admin/integration-definitions")]
    public async Task<IActionResult> GetIntegrationDefinitions([FromQuery] bool activeOnly = false)
    {
        if (!IsAdmin) return Forbid();
        return Ok(await workflow.GetIntegrationDefinitionsAsync(activeOnly));
    }

    [HttpPost("admin/integration-definitions")]
    public async Task<IActionResult> CreateIntegrationDefinition([FromBody] UpsertWorkflowIntegrationDefinitionDto dto)
    {
        if (!IsAdmin) return Forbid();
        return Ok(await workflow.CreateIntegrationDefinitionAsync(dto));
    }

    [HttpPut("admin/integration-definitions/{integrationId:int}")]
    public async Task<IActionResult> UpdateIntegrationDefinition(int integrationId, [FromBody] UpsertWorkflowIntegrationDefinitionDto dto)
    {
        if (!IsAdmin) return Forbid();
        return Ok(await workflow.UpdateIntegrationDefinitionAsync(integrationId, dto));
    }

    [HttpDelete("admin/integration-definitions/{integrationId:int}")]
    public async Task<IActionResult> DeleteIntegrationDefinition(int integrationId)
    {
        if (!IsAdmin) return Forbid();
        await workflow.DeleteIntegrationDefinitionAsync(integrationId);
        return NoContent();
    }

    [HttpGet("admin/services/{serviceId:int}/workflow-capabilities")]
    public async Task<IActionResult> GetAdminServiceCapabilities(int serviceId, [FromQuery] bool activeOnly = false)
    {
        if (!IsAdmin) return Forbid();
        return Ok(await workflow.GetServiceCapabilitiesAsync(serviceId, activeOnly));
    }

    [HttpPost("admin/services/{serviceId:int}/workflow-capabilities")]
    public async Task<IActionResult> CreateServiceCapability(int serviceId, [FromBody] UpsertServiceWorkflowCapabilityDto dto)
    {
        if (!IsAdmin) return Forbid();
        dto.ServiceId = serviceId;
        return Ok(await workflow.CreateServiceCapabilityAsync(dto));
    }

    [HttpPut("admin/workflow-capabilities/{capabilityId:int}")]
    public async Task<IActionResult> UpdateServiceCapability(int capabilityId, [FromBody] UpsertServiceWorkflowCapabilityDto dto)
    {
        if (!IsAdmin) return Forbid();
        return Ok(await workflow.UpdateServiceCapabilityAsync(capabilityId, dto));
    }

    [HttpDelete("admin/workflow-capabilities/{capabilityId:int}")]
    public async Task<IActionResult> DeleteServiceCapability(int capabilityId)
    {
        if (!IsAdmin) return Forbid();
        await workflow.DeleteServiceCapabilityAsync(capabilityId);
        return NoContent();
    }

    [HttpGet("workflow/services/{serviceId:int}/capabilities")]
    public async Task<IActionResult> GetServiceCapabilities(int serviceId, [FromQuery] bool activeOnly = true) =>
        Ok(await workflow.GetServiceCapabilitiesAsync(serviceId, activeOnly));

    [HttpGet("workflow/user-services/{userServiceId:int}/steps")]
    public async Task<IActionResult> GetWorkflowSteps(int userServiceId) =>
        Ok(await workflow.GetWorkflowStepsAsync(CallerId, IsAdmin, IsDeveloper, userServiceId));

    [HttpPut("workflow/user-services/{userServiceId:int}/selection")]
    public async Task<IActionResult> SaveRequestedSelection(int userServiceId, [FromBody] WorkflowStepSelectionDto dto) =>
        Ok(await workflow.SaveRequestedSelectionAsync(CallerId, IsAdmin, userServiceId, dto));

    [HttpPost("workflow/user-services/{userServiceId:int}/confirm")]
    public async Task<IActionResult> ConfirmSelection(int userServiceId, [FromBody] WorkflowStepSelectionDto dto)
    {
        var result = await workflow.ConfirmSelectionAsync(CallerId, IsAdmin, IsDeveloper, userServiceId, dto);
        await integrations.SynchronizeAsync(userServiceId);
        return Ok(result);
    }

    [HttpPut("workflow/user-services/{userServiceId:int}/steps/{workflowStepId:int}/credentials")]
    public async Task<IActionResult> UpdateCredentials(int userServiceId, int workflowStepId, [FromBody] WorkflowCredentialUpdateDto dto) =>
        Ok(await workflow.UpdateWorkflowStepCredentialsAsync(CallerId, IsAdmin, IsDeveloper, userServiceId, workflowStepId, dto));

    [HttpGet("workflow/user-services/{userServiceId:int}/custom-form")]
    public async Task<IActionResult> GetCustomForm(int userServiceId)
    {
        var form = await workflow.GetCustomFormAsync(CallerId, IsAdmin, IsDeveloper, userServiceId);
        return form is null ? NotFound(new { error = "No custom form has been created for this service yet." }) : Ok(form);
    }

    [HttpPost("workflow/user-services/{userServiceId:int}/custom-form")]
    public async Task<IActionResult> CreateCustomForm(int userServiceId, [FromBody] UpsertDevUserServiceFormDto dto) =>
        Ok(await workflow.UpsertCustomFormAsync(CallerId, IsAdmin, IsDeveloper, userServiceId, dto));

    [HttpPut("workflow/user-services/{userServiceId:int}/custom-form")]
    public async Task<IActionResult> UpdateCustomForm(int userServiceId, [FromBody] UpsertDevUserServiceFormDto dto) =>
        Ok(await workflow.UpsertCustomFormAsync(CallerId, IsAdmin, IsDeveloper, userServiceId, dto));

    [HttpDelete("workflow/user-services/{userServiceId:int}/custom-form")]
    public async Task<IActionResult> DeleteCustomForm(int userServiceId)
    {
        await workflow.DeleteCustomFormAsync(CallerId, IsAdmin, IsDeveloper, userServiceId);
        return NoContent();
    }
}
