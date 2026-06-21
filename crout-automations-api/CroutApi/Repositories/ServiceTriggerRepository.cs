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

    public async Task<IEnumerable<ServiceTriggerConfig>> GetConfigsAsync(int userId, int companyId, int serviceId)
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
              AND (
                stc.user_service_id IS NULL
                OR (us.company_id = @companyId AND us.service_id = @serviceId AND us.Active = 1)
              )
            ORDER BY stc.sort_order, stc.service_trigger_config_id
            """,
            new { userId, companyId, serviceId });
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
