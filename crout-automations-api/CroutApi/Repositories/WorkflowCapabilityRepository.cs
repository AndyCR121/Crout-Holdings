using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class WorkflowCapabilityRepository(DbHelper db) : IWorkflowCapabilityRepository
{
    public async Task<ServiceWorkflowCapability?> GetCapabilityByIdAsync(int capabilityId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<ServiceWorkflowCapability>(
            """
            SELECT
              swc.id AS Id,
              swc.service_id AS ServiceId,
              swc.role AS Role,
              swc.capability_type AS CapabilityType,
              swc.name AS Name,
              swc.description AS Description,
              swc.price AS Price,
              swc.display_order AS DisplayOrder,
              swc.is_active AS IsActive,
              swc.integration_id AS IntegrationId,
              swc.requires_credentials AS RequiresCredentials,
              swc.configuration_schema_json AS ConfigurationSchemaJson,
              swc.created_at AS CreatedAt,
              swc.updated_at AS UpdatedAt,
              idef.name AS IntegrationName
            FROM ServiceWorkflowCapabilities swc
            LEFT JOIN IntegrationDefinitions idef ON idef.id = swc.integration_id
            WHERE swc.id = @capabilityId
            """,
            new { capabilityId });
    }

    public async Task<IEnumerable<ServiceWorkflowCapability>> GetCapabilitiesByServiceAsync(int serviceId, bool activeOnly)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<ServiceWorkflowCapability>(
            """
            SELECT
              swc.id AS Id,
              swc.service_id AS ServiceId,
              swc.role AS Role,
              swc.capability_type AS CapabilityType,
              swc.name AS Name,
              swc.description AS Description,
              swc.price AS Price,
              swc.display_order AS DisplayOrder,
              swc.is_active AS IsActive,
              swc.integration_id AS IntegrationId,
              swc.requires_credentials AS RequiresCredentials,
              swc.configuration_schema_json AS ConfigurationSchemaJson,
              swc.created_at AS CreatedAt,
              swc.updated_at AS UpdatedAt,
              idef.name AS IntegrationName
            FROM ServiceWorkflowCapabilities swc
            LEFT JOIN IntegrationDefinitions idef ON idef.id = swc.integration_id
            WHERE swc.service_id = @serviceId
              AND (@activeOnly = 0 OR swc.is_active = 1)
            ORDER BY swc.role, swc.display_order, swc.id
            """,
            new { serviceId, activeOnly });
    }

    public async Task<int> CreateCapabilityAsync(ServiceWorkflowCapability capability)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO ServiceWorkflowCapabilities
              (service_id, role, capability_type, name, description, price, display_order, is_active, integration_id, requires_credentials, configuration_schema_json)
            VALUES
              (@ServiceId, @Role, @CapabilityType, @Name, @Description, @Price, @DisplayOrder, @IsActive, @IntegrationId, @RequiresCredentials, @ConfigurationSchemaJson);
            SELECT LAST_INSERT_ID();
            """,
            capability);
    }

    public async Task UpdateCapabilityAsync(ServiceWorkflowCapability capability)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE ServiceWorkflowCapabilities
            SET service_id = @ServiceId,
                role = @Role,
                capability_type = @CapabilityType,
                name = @Name,
                description = @Description,
                price = @Price,
                display_order = @DisplayOrder,
                is_active = @IsActive,
                integration_id = @IntegrationId,
                requires_credentials = @RequiresCredentials,
                configuration_schema_json = @ConfigurationSchemaJson
            WHERE id = @Id
            """,
            capability);
    }

    public async Task DeleteCapabilityAsync(int capabilityId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("DELETE FROM ServiceWorkflowCapabilities WHERE id = @capabilityId", new { capabilityId });
    }

    public async Task<WorkflowIntegrationDefinition?> GetIntegrationDefinitionByIdAsync(int integrationId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<WorkflowIntegrationDefinition>(
            """
            SELECT
              id AS Id,
              name AS Name,
              description AS Description,
              integration_type AS IntegrationType,
              has_credentials AS HasCredentials,
              credential_form_schema_json AS CredentialFormSchemaJson,
              is_active AS IsActive,
              created_at AS CreatedAt,
              updated_at AS UpdatedAt
            FROM IntegrationDefinitions
            WHERE id = @integrationId
            """,
            new { integrationId });
    }

    public async Task<IEnumerable<WorkflowIntegrationDefinition>> GetIntegrationDefinitionsAsync(bool activeOnly)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<WorkflowIntegrationDefinition>(
            """
            SELECT
              id AS Id,
              name AS Name,
              description AS Description,
              integration_type AS IntegrationType,
              has_credentials AS HasCredentials,
              credential_form_schema_json AS CredentialFormSchemaJson,
              is_active AS IsActive,
              created_at AS CreatedAt,
              updated_at AS UpdatedAt
            FROM IntegrationDefinitions
            WHERE (@activeOnly = 0 OR is_active = 1)
            ORDER BY name, id
            """,
            new { activeOnly });
    }

    public async Task<int> CreateIntegrationDefinitionAsync(WorkflowIntegrationDefinition definition)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO IntegrationDefinitions
              (name, description, integration_type, has_credentials, credential_form_schema_json, is_active)
            VALUES
              (@Name, @Description, @IntegrationType, @HasCredentials, @CredentialFormSchemaJson, @IsActive);
            SELECT LAST_INSERT_ID();
            """,
            definition);
    }

    public async Task UpdateIntegrationDefinitionAsync(WorkflowIntegrationDefinition definition)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE IntegrationDefinitions
            SET name = @Name,
                description = @Description,
                integration_type = @IntegrationType,
                has_credentials = @HasCredentials,
                credential_form_schema_json = @CredentialFormSchemaJson,
                is_active = @IsActive
            WHERE id = @Id
            """,
            definition);
    }

    public async Task DeleteIntegrationDefinitionAsync(int integrationId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("DELETE FROM IntegrationDefinitions WHERE id = @integrationId", new { integrationId });
    }

    public async Task<UserServiceAccessContext?> GetUserServiceAccessContextAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<UserServiceAccessContext>(
            """
            SELECT
              us.id AS UserServiceId,
              us.service_id AS ServiceId,
              us.company_id AS CompanyId,
              c.user_id AS OwnerUserId,
              us.Active AS UserServiceActive,
              (
                SELECT ds.userId
                FROM DevServices ds
                WHERE ds.userServiceId = us.id
                  AND ds.isActive = 1
                ORDER BY ds.devServiceId DESC
                LIMIT 1
              ) AS AssignedDeveloperUserId
            FROM UserServices us
            JOIN Companies c ON c.company_id = us.company_id
            WHERE us.id = @userServiceId
            """,
            new { userServiceId });
    }

    public async Task<IEnumerable<UserServiceWorkflowStep>> GetWorkflowStepsByUserServiceIdAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<UserServiceWorkflowStep>(
            """
            SELECT
              usws.id AS Id,
              usws.user_service_id AS UserServiceId,
              usws.service_id AS ServiceId,
              usws.service_workflow_capability_id AS ServiceWorkflowCapabilityId,
              usws.role AS Role,
              usws.capability_type AS CapabilityType,
              usws.integration_id AS IntegrationId,
              usws.status AS Status,
              usws.configuration_json AS ConfigurationJson,
              usws.credential_values_json AS CredentialValuesJson,
              usws.confirmed_at AS ConfirmedAt,
              usws.confirmed_by_user_id AS ConfirmedByUserId,
              usws.created_at AS CreatedAt,
              usws.updated_at AS UpdatedAt,
              swc.name AS CapabilityName,
              swc.description AS CapabilityDescription,
              swc.is_active AS CapabilityIsActive,
              swc.requires_credentials AS RequiresCredentials,
              swc.configuration_schema_json AS ConfigurationSchemaJson,
              idef.credential_form_schema_json AS CredentialSchemaJson,
              idef.name AS IntegrationName,
              COALESCE(idef.is_active, 0) AS IntegrationIsActive
            FROM UserServiceWorkflowSteps usws
            JOIN ServiceWorkflowCapabilities swc ON swc.id = usws.service_workflow_capability_id
            LEFT JOIN IntegrationDefinitions idef ON idef.id = usws.integration_id
            WHERE usws.user_service_id = @userServiceId
            ORDER BY FIELD(usws.role, 'Trigger', 'Action', 'Output'), swc.display_order, usws.id
            """,
            new { userServiceId });
    }

    public async Task<UserServiceWorkflowStep?> GetWorkflowStepByIdAsync(int workflowStepId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<UserServiceWorkflowStep>(
            """
            SELECT
              usws.id AS Id,
              usws.user_service_id AS UserServiceId,
              usws.service_id AS ServiceId,
              usws.service_workflow_capability_id AS ServiceWorkflowCapabilityId,
              usws.role AS Role,
              usws.capability_type AS CapabilityType,
              usws.integration_id AS IntegrationId,
              usws.status AS Status,
              usws.configuration_json AS ConfigurationJson,
              usws.credential_values_json AS CredentialValuesJson,
              usws.confirmed_at AS ConfirmedAt,
              usws.confirmed_by_user_id AS ConfirmedByUserId,
              usws.created_at AS CreatedAt,
              usws.updated_at AS UpdatedAt,
              swc.name AS CapabilityName,
              swc.description AS CapabilityDescription,
              swc.is_active AS CapabilityIsActive,
              swc.requires_credentials AS RequiresCredentials,
              swc.configuration_schema_json AS ConfigurationSchemaJson,
              idef.credential_form_schema_json AS CredentialSchemaJson,
              idef.name AS IntegrationName,
              COALESCE(idef.is_active, 0) AS IntegrationIsActive
            FROM UserServiceWorkflowSteps usws
            JOIN ServiceWorkflowCapabilities swc ON swc.id = usws.service_workflow_capability_id
            LEFT JOIN IntegrationDefinitions idef ON idef.id = usws.integration_id
            WHERE usws.id = @workflowStepId
            """,
            new { workflowStepId });
    }

    public async Task<UserServiceWorkflowStep> UpsertWorkflowStepAsync(UserServiceWorkflowStep step)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            INSERT INTO UserServiceWorkflowSteps
              (user_service_id, service_id, service_workflow_capability_id, role, capability_type, integration_id, status, configuration_json, credential_values_json, confirmed_at, confirmed_by_user_id)
            VALUES
              (@UserServiceId, @ServiceId, @ServiceWorkflowCapabilityId, @Role, @CapabilityType, @IntegrationId, @Status, @ConfigurationJson, @CredentialValuesJson, @ConfirmedAt, @ConfirmedByUserId)
            ON DUPLICATE KEY UPDATE
              role = VALUES(role),
              capability_type = VALUES(capability_type),
              integration_id = VALUES(integration_id),
              status = VALUES(status),
              configuration_json = VALUES(configuration_json),
              credential_values_json = COALESCE(VALUES(credential_values_json), credential_values_json),
              confirmed_at = VALUES(confirmed_at),
              confirmed_by_user_id = VALUES(confirmed_by_user_id)
            """,
            step);

        return await conn.QuerySingleAsync<UserServiceWorkflowStep>(
            """
            SELECT
              usws.id AS Id,
              usws.user_service_id AS UserServiceId,
              usws.service_id AS ServiceId,
              usws.service_workflow_capability_id AS ServiceWorkflowCapabilityId,
              usws.role AS Role,
              usws.capability_type AS CapabilityType,
              usws.integration_id AS IntegrationId,
              usws.status AS Status,
              usws.configuration_json AS ConfigurationJson,
              usws.credential_values_json AS CredentialValuesJson,
              usws.confirmed_at AS ConfirmedAt,
              usws.confirmed_by_user_id AS ConfirmedByUserId,
              usws.created_at AS CreatedAt,
              usws.updated_at AS UpdatedAt,
              swc.name AS CapabilityName,
              swc.description AS CapabilityDescription,
              swc.is_active AS CapabilityIsActive,
              swc.requires_credentials AS RequiresCredentials,
              swc.configuration_schema_json AS ConfigurationSchemaJson,
              idef.credential_form_schema_json AS CredentialSchemaJson,
              idef.name AS IntegrationName,
              COALESCE(idef.is_active, 0) AS IntegrationIsActive
            FROM UserServiceWorkflowSteps usws
            JOIN ServiceWorkflowCapabilities swc ON swc.id = usws.service_workflow_capability_id
            LEFT JOIN IntegrationDefinitions idef ON idef.id = usws.integration_id
            WHERE usws.user_service_id = @UserServiceId
              AND usws.service_workflow_capability_id = @ServiceWorkflowCapabilityId
            """,
            step);
    }

    public async Task DisableWorkflowStepsExceptAsync(int userServiceId, IEnumerable<int> capabilityIds, string status)
    {
        using var conn = db.GetConnection();
        var ids = capabilityIds?.Distinct().ToArray() ?? [];
        if (ids.Length == 0)
        {
            await conn.ExecuteAsync(
                "UPDATE UserServiceWorkflowSteps SET status = @status WHERE user_service_id = @userServiceId",
                new { userServiceId, status });
            return;
        }

        await conn.ExecuteAsync(
            """
            UPDATE UserServiceWorkflowSteps
            SET status = @status
            WHERE user_service_id = @userServiceId
              AND service_workflow_capability_id NOT IN @ids
            """,
            new { userServiceId, status, ids });
    }

    public async Task<UserServiceCustomForm?> GetCustomFormByUserServiceIdAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<UserServiceCustomForm>(
            """
            SELECT
              id AS Id,
              user_service_id AS UserServiceId,
              workflow_step_id AS WorkflowStepId,
              form_schema_json AS FormSchemaJson,
              production_webhook_url AS ProductionWebhookUrl,
              is_active AS IsActive,
              created_at AS CreatedAt,
              updated_at AS UpdatedAt
            FROM UserServiceCustomForms
            WHERE user_service_id = @userServiceId
            """,
            new { userServiceId });
    }

    public async Task<UserServiceCustomForm> UpsertCustomFormAsync(UserServiceCustomForm form)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            INSERT INTO UserServiceCustomForms
              (user_service_id, workflow_step_id, form_schema_json, production_webhook_url, is_active)
            VALUES
              (@UserServiceId, @WorkflowStepId, @FormSchemaJson, @ProductionWebhookUrl, @IsActive)
            ON DUPLICATE KEY UPDATE
              workflow_step_id = VALUES(workflow_step_id),
              form_schema_json = VALUES(form_schema_json),
              production_webhook_url = VALUES(production_webhook_url),
              is_active = VALUES(is_active)
            """,
            form);

        return await conn.QuerySingleAsync<UserServiceCustomForm>(
            """
            SELECT
              id AS Id,
              user_service_id AS UserServiceId,
              workflow_step_id AS WorkflowStepId,
              form_schema_json AS FormSchemaJson,
              production_webhook_url AS ProductionWebhookUrl,
              is_active AS IsActive,
              created_at AS CreatedAt,
              updated_at AS UpdatedAt
            FROM UserServiceCustomForms
            WHERE user_service_id = @UserServiceId
            """,
            form);
    }

    public async Task DeleteCustomFormAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE UserServiceCustomForms
            SET is_active = 0
            WHERE user_service_id = @userServiceId
            """,
            new { userServiceId });
    }
}
