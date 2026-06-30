using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class ServiceTriggerRepository(DbHelper db) : IServiceTriggerRepository
{
    private const string SelectConfig =
        "stc.service_trigger_config_id AS ServiceTriggerConfigId, stc.service_id AS ServiceId, stc.user_service_id AS UserServiceId, " +
        "stc.workflow_id AS WorkflowId, stc.trigger_type AS TriggerType, stc.Label, stc.Description, stc.endpoint_path AS EndpointPath, " +
        "stc.method AS Method, stc.requires_confirmation AS RequiresConfirmation, stc.payload_template AS PayloadTemplate, " +
        "stc.fields_json AS FieldsJson, stc.file_upload_json AS FileUploadJson, stc.response_mode AS ResponseMode, " +
        "stc.is_active AS IsActive, stc.sort_order AS SortOrder";

    public async Task<IEnumerable<ServiceTriggerConfig>> GetConfigsAsync(int userId, int companyId, int serviceId, int? userServiceId = null)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<ServiceTriggerConfig>(
            $"""
            SELECT {SelectConfig}
            FROM ServiceTriggerConfigs stc
            JOIN Companies c ON c.company_id = @companyId AND c.user_id = @userId AND c.Active = 1
            LEFT JOIN UserServices us ON us.id = stc.user_service_id
            WHERE stc.service_id = @serviceId
              AND stc.is_active = 1
              AND (@userServiceId IS NULL OR stc.user_service_id IS NULL OR stc.user_service_id = @userServiceId)
              AND (
                stc.user_service_id IS NULL
                OR (us.company_id = @companyId AND us.service_id = @serviceId AND us.Active = 1)
              )
            ORDER BY stc.sort_order, stc.service_trigger_config_id
            """,
            new { userId, companyId, serviceId, userServiceId });
    }

    public async Task<ServiceTriggerConfig?> GetConfigForExecutionAsync(int userId, int configId, int companyId, int? userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<ServiceTriggerConfig>(
            $"""
            SELECT {SelectConfig}
            FROM ServiceTriggerConfigs stc
            JOIN Companies c ON c.company_id = @companyId AND c.user_id = @userId AND c.Active = 1
            LEFT JOIN UserServices us ON us.company_id = c.company_id AND us.service_id = stc.service_id AND us.Active = 1
            WHERE stc.service_trigger_config_id = @configId
              AND stc.is_active = 1
              AND (@userServiceId IS NULL OR us.id = @userServiceId)
            LIMIT 1
            """,
            new { userId, configId, companyId, userServiceId });
    }

    public async Task<DeveloperAssignedFormContext?> GetDeveloperAssignedFormContextAsync(int developerUserId, int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<DeveloperAssignedFormContext>(
            """
            SELECT
              us.id AS UserServiceId,
              us.service_id AS ServiceId,
              i.integration_id AS IntegrationId,
              i.workflow_id AS WorkflowId,
              i.custom_form_webhook_url AS WebhookUrl
            FROM UserServices us
            JOIN DevServices ds ON ds.userServiceId = us.id
            LEFT JOIN Integrations i ON i.user_service_id = us.id
            WHERE us.id = @userServiceId
              AND us.Active = 1
              AND ds.userId = @developerUserId
              AND ds.isActive = 1
            LIMIT 1
            """,
            new { developerUserId, userServiceId });
    }

    public async Task<ServiceTriggerConfig?> GetFormConfigByUserServiceIdAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<ServiceTriggerConfig>(
            $"""
            SELECT {SelectConfig}
            FROM ServiceTriggerConfigs stc
            WHERE stc.user_service_id = @userServiceId
              AND stc.trigger_type = 'form'
              AND stc.is_active = 1
            ORDER BY stc.sort_order, stc.service_trigger_config_id
            LIMIT 1
            """,
            new { userServiceId });
    }

    public async Task<ServiceTriggerConfig> CreateFormConfigAsync(ServiceTriggerConfig config)
    {
        using var conn = db.GetConnection();
        var id = await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO ServiceTriggerConfigs
              (service_id, user_service_id, workflow_id, trigger_type, Label, Description, endpoint_path, method, requires_confirmation, payload_template, fields_json, file_upload_json, response_mode, is_active, sort_order)
            VALUES
              (@ServiceId, @UserServiceId, @WorkflowId, @TriggerType, @Label, @Description, @EndpointPath, @Method, @RequiresConfirmation, @PayloadTemplate, @FieldsJson, @FileUploadJson, @ResponseMode, @IsActive, @SortOrder);
            SELECT LAST_INSERT_ID();
            """,
            config);

        config.ServiceTriggerConfigId = id;
        return config;
    }

    public async Task<ServiceTriggerConfig> UpdateFormConfigAsync(ServiceTriggerConfig config)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE ServiceTriggerConfigs
            SET service_id = @ServiceId,
                user_service_id = @UserServiceId,
                workflow_id = @WorkflowId,
                trigger_type = @TriggerType,
                Label = @Label,
                Description = @Description,
                endpoint_path = @EndpointPath,
                method = @Method,
                requires_confirmation = @RequiresConfirmation,
                payload_template = @PayloadTemplate,
                fields_json = @FieldsJson,
                file_upload_json = @FileUploadJson,
                response_mode = @ResponseMode,
                is_active = @IsActive,
                sort_order = @SortOrder
            WHERE service_trigger_config_id = @ServiceTriggerConfigId
            """,
            config);

        return config;
    }

    public async Task DeactivateFormConfigAsync(int configId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE ServiceTriggerConfigs
            SET is_active = 0
            WHERE service_trigger_config_id = @configId
            """,
            new { configId });
    }

    public async Task<int> CreateExecutionAsync(ServiceTriggerExecution execution)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO ServiceTriggerExecutions
              (service_trigger_config_id, user_id, company_id, user_service_id, request_payload, response_payload, Status, mode, error_message)
            VALUES
              (@ServiceTriggerConfigId, @UserId, @CompanyId, @UserServiceId, @RequestPayload, @ResponsePayload, @Status, @Mode, @ErrorMessage);
            SELECT LAST_INSERT_ID();
            """,
            execution);
    }
}
