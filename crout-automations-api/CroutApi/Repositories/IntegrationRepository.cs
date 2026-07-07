using CroutApi.DTOs;
using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;
using MySqlConnector;

namespace CroutApi.Repositories;

public class IntegrationRepository(DbHelper db) : IIntegrationRepository
{
    public async Task<Integration?> GetByUserServiceIdAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<Integration>(
            """
            SELECT
              integration_id AS IntegrationId,
              user_service_id AS UserServiceId,
              company_id AS CompanyId,
              workflow_id AS WorkflowId,
              workflow_name AS WorkflowName,
              custom_form_title AS CustomFormTitle,
              custom_form_webhook_url AS CustomFormWebhookUrl,
              status AS Status,
              published_by AS PublishedBy,
              published_date AS PublishedDate,
              paused_by AS PausedBy,
              paused_date AS PausedDate,
              last_error AS LastError,
              node_mappings_json AS NodeMappingsJson,
              workflow_definition_json AS WorkflowDefinitionJson,
              custom_form_draft_schema_json AS CustomFormDraftSchemaJson,
              custom_form_published_schema_json AS CustomFormPublishedSchemaJson,
              custom_form_version AS CustomFormVersion,
              custom_form_published_by AS CustomFormPublishedBy,
              custom_form_published_at AS CustomFormPublishedAt,
              createdAt AS CreatedAt,
              updatedAt AS UpdatedAt
            FROM Integrations
            WHERE user_service_id = @userServiceId
            """,
            new { userServiceId });
    }

    public async Task<Integration?> GetByIntegrationIdAsync(int integrationId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<Integration>(
            """
            SELECT
              integration_id AS IntegrationId,
              user_service_id AS UserServiceId,
              company_id AS CompanyId,
              workflow_id AS WorkflowId,
              workflow_name AS WorkflowName,
              custom_form_title AS CustomFormTitle,
              custom_form_webhook_url AS CustomFormWebhookUrl,
              status AS Status,
              published_by AS PublishedBy,
              published_date AS PublishedDate,
              paused_by AS PausedBy,
              paused_date AS PausedDate,
              last_error AS LastError,
              node_mappings_json AS NodeMappingsJson,
              workflow_definition_json AS WorkflowDefinitionJson,
              custom_form_draft_schema_json AS CustomFormDraftSchemaJson,
              custom_form_published_schema_json AS CustomFormPublishedSchemaJson,
              custom_form_version AS CustomFormVersion,
              custom_form_published_by AS CustomFormPublishedBy,
              custom_form_published_at AS CustomFormPublishedAt,
              createdAt AS CreatedAt,
              updatedAt AS UpdatedAt
            FROM Integrations
            WHERE integration_id = @integrationId
            """,
            new { integrationId });
    }

    public async Task<CustomFormAccessContextDto?> GetCustomFormContextByIntegrationIdAsync(int integrationId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<CustomFormAccessContextDto>(
            """
            SELECT
              i.integration_id AS IntegrationId,
              i.user_service_id AS UserServiceId,
              us.service_id AS ServiceId,
              i.company_id AS CompanyId,
              c.user_id AS CompanyOwnerUserId,
              (
                SELECT ds.userId
                FROM DevServices ds
                WHERE ds.userServiceId = us.id
                  AND ds.isActive = 1
                ORDER BY ds.devServiceId DESC
                LIMIT 1
              ) AS AssignedDeveloperUserId,
              us.Active AS UserServiceActive,
              i.custom_form_title AS Title,
              i.custom_form_webhook_url AS WebhookUrl,
              i.custom_form_draft_schema_json AS DraftSchemaJson,
              i.custom_form_published_schema_json AS PublishedSchemaJson,
              i.custom_form_version AS Version,
              i.custom_form_published_at AS PublishedAtUtc,
              i.custom_form_published_by AS PublishedByUserId
            FROM Integrations i
            JOIN UserServices us ON us.id = i.user_service_id
            JOIN Companies c ON c.company_id = i.company_id
            WHERE i.integration_id = @integrationId
            """,
            new { integrationId });
    }

    public async Task<CustomFormAccessContextDto?> GetCustomFormContextByUserServiceIdAsync(int userServiceId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<CustomFormAccessContextDto>(
            """
            SELECT
              i.integration_id AS IntegrationId,
              i.user_service_id AS UserServiceId,
              us.service_id AS ServiceId,
              i.company_id AS CompanyId,
              c.user_id AS CompanyOwnerUserId,
              (
                SELECT ds.userId
                FROM DevServices ds
                WHERE ds.userServiceId = us.id
                  AND ds.isActive = 1
                ORDER BY ds.devServiceId DESC
                LIMIT 1
              ) AS AssignedDeveloperUserId,
              us.Active AS UserServiceActive,
              i.custom_form_title AS Title,
              i.custom_form_webhook_url AS WebhookUrl,
              i.custom_form_draft_schema_json AS DraftSchemaJson,
              i.custom_form_published_schema_json AS PublishedSchemaJson,
              i.custom_form_version AS Version,
              i.custom_form_published_at AS PublishedAtUtc,
              i.custom_form_published_by AS PublishedByUserId
            FROM Integrations i
            JOIN UserServices us ON us.id = i.user_service_id
            JOIN Companies c ON c.company_id = i.company_id
            WHERE i.user_service_id = @userServiceId
            """,
            new { userServiceId });
    }

    public async Task<int> CreatePlaceholderAsync(Integration integration)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO Integrations
              (user_service_id, company_id, workflow_name, status, last_error)
            VALUES
              (@UserServiceId, @CompanyId, @WorkflowName, @Status, @LastError);
            SELECT LAST_INSERT_ID();
            """,
            integration);
    }

    public async Task<bool> TryCreatePlaceholderAsync(Integration integration)
    {
        try
        {
            integration.IntegrationId = await CreatePlaceholderAsync(integration);
            return true;
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            return false;
        }
    }

    public async Task UpdateProvisioningAsync(int integrationId, string workflowId, string workflowDefinitionJson, string? nodeMappingsJson)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE Integrations
            SET workflow_id = @workflowId,
                workflow_definition_json = @workflowDefinitionJson,
                node_mappings_json = @nodeMappingsJson,
                last_error = NULL
            WHERE integration_id = @integrationId
            """,
            new { integrationId, workflowId, workflowDefinitionJson, nodeMappingsJson });
    }

    public async Task UpdateWorkflowStateAsync(int integrationId, string status, string? lastError, int? publishedBy, DateTime? publishedDate, int? pausedBy, DateTime? pausedDate, string? workflowDefinitionJson, string? nodeMappingsJson)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE Integrations
            SET status = @status,
                last_error = @lastError,
                published_by = @publishedBy,
                published_date = @publishedDate,
                paused_by = @pausedBy,
                paused_date = @pausedDate,
                workflow_definition_json = COALESCE(@workflowDefinitionJson, workflow_definition_json),
                node_mappings_json = COALESCE(@nodeMappingsJson, node_mappings_json)
            WHERE integration_id = @integrationId
            """,
            new
            {
                integrationId,
                status,
                lastError,
                publishedBy,
                publishedDate,
                pausedBy,
                pausedDate,
                workflowDefinitionJson,
                nodeMappingsJson
            });
    }

    public async Task SaveCustomFormDraftAsync(int integrationId, string title, string webhookUrl, string schemaJson)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE Integrations
            SET custom_form_title = @title,
                custom_form_webhook_url = @webhookUrl,
                custom_form_draft_schema_json = @schemaJson
            WHERE integration_id = @integrationId
            """,
            new { integrationId, title, webhookUrl, schemaJson });
    }

    public async Task PublishCustomFormAsync(int integrationId, string title, string webhookUrl, string schemaJson, int version, int publishedByUserId, DateTime publishedAtUtc)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE Integrations
            SET custom_form_title = @title,
                custom_form_webhook_url = @webhookUrl,
                custom_form_published_schema_json = @schemaJson,
                custom_form_version = @version,
                custom_form_published_by = @publishedByUserId,
                custom_form_published_at = @publishedAtUtc
            WHERE integration_id = @integrationId
            """,
            new { integrationId, title, webhookUrl, schemaJson, version, publishedByUserId, publishedAtUtc });
    }

    public async Task UnpublishCustomFormAsync(int integrationId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE Integrations
            SET custom_form_published_schema_json = NULL,
                custom_form_published_by = NULL,
                custom_form_published_at = NULL
            WHERE integration_id = @integrationId
            """,
            new { integrationId });
    }

    public async Task DeleteCustomFormAsync(int integrationId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync(
            """
            UPDATE Integrations
            SET custom_form_title = NULL,
                custom_form_webhook_url = NULL,
                custom_form_draft_schema_json = NULL,
                custom_form_published_schema_json = NULL,
                custom_form_version = 0,
                custom_form_published_by = NULL,
                custom_form_published_at = NULL
            WHERE integration_id = @integrationId
            """,
            new { integrationId });
    }
}
