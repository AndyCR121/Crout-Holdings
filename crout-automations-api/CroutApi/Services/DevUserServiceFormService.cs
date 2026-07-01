using System.Text.Json;
using CroutApi.DTOs;
using CroutApi.Models;
using CroutApi.Repositories;

namespace CroutApi.Services;

public class DevUserServiceFormService(
    IWorkflowCapabilityService workflow) : IDevUserServiceFormService
{
    public async Task<DevUserServiceFormDto?> GetAsync(int developerUserId, int userServiceId)
    {
        var form = await workflow.GetCustomFormAsync(developerUserId, isAdmin: false, isDeveloper: true, userServiceId);
        return form is null ? null : ToDto(form);
    }

    public async Task<DevUserServiceFormDto> CreateAsync(int developerUserId, int userServiceId, UpsertDevUserServiceFormDto dto)
    {
        return ToDto(await workflow.UpsertCustomFormAsync(developerUserId, isAdmin: false, isDeveloper: true, userServiceId, dto));
    }

    public async Task<DevUserServiceFormDto> UpdateAsync(int developerUserId, int userServiceId, UpsertDevUserServiceFormDto dto)
    {
        return ToDto(await workflow.UpsertCustomFormAsync(developerUserId, isAdmin: false, isDeveloper: true, userServiceId, dto));
    }

    public async Task DeleteAsync(int developerUserId, int userServiceId)
    {
        await workflow.DeleteCustomFormAsync(developerUserId, isAdmin: false, isDeveloper: true, userServiceId);
    }

    private static DevUserServiceFormDto ToDto(UserServiceCustomFormRecordDto form) => new()
    {
        FormId = form.Id,
        UserServiceId = form.UserServiceId,
        Label = form.Label,
        Description = form.Description,
        ResponseMode = form.ResponseMode,
        PayloadTemplate = form.PayloadTemplate,
        Schema = form.Schema,
        SchemaVersion = form.SchemaVersion,
        ProductionWebhookUrl = form.ProductionWebhookUrl,
        UpdatedAtUtc = form.UpdatedAt
    };
}
