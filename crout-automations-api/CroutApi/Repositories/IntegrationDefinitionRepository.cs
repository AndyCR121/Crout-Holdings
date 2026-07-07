using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class IntegrationDefinitionRepository(DbHelper db) : IIntegrationDefinitionRepository
{
    public async Task<IntegrationDefinition?> GetByIdAsync(int integrationId)
    {
        using var conn = db.GetConnection();
        return await conn.QuerySingleOrDefaultAsync<IntegrationDefinition>(
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

    public async Task<IEnumerable<IntegrationDefinition>> GetAllAsync(bool activeOnly)
    {
        using var conn = db.GetConnection();
        return await conn.QueryAsync<IntegrationDefinition>(
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
            ORDER BY is_active DESC, name, id
            """,
            new { activeOnly });
    }

    public async Task<int> CreateAsync(IntegrationDefinition definition)
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

    public async Task UpdateAsync(IntegrationDefinition definition)
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

    public async Task DeleteAsync(int integrationId)
    {
        using var conn = db.GetConnection();
        await conn.ExecuteAsync("DELETE FROM IntegrationDefinitions WHERE id = @integrationId", new { integrationId });
    }
}
