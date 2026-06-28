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
              status AS Status,
              published_by AS PublishedBy,
              published_date AS PublishedDate,
              paused_by AS PausedBy,
              paused_date AS PausedDate,
              last_error AS LastError,
              node_mappings_json AS NodeMappingsJson,
              workflow_definition_json AS WorkflowDefinitionJson,
              createdAt AS CreatedAt,
              updatedAt AS UpdatedAt
            FROM Integrations
            WHERE user_service_id = @userServiceId
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
}
