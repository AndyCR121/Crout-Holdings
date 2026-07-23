using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public sealed class UserServiceCredentialRepository(DbHelper db) : IUserServiceCredentialRepository
{
    public async Task<UserServiceCredential?> GetAsync(int userServiceId, int integrationDefinitionId)
    {
        using var connection = db.GetConnection();
        return await connection.QuerySingleOrDefaultAsync<UserServiceCredential>(
            """
            SELECT id AS Id, user_service_id AS UserServiceId, company_id AS CompanyId,
                   integration_definition_id AS IntegrationDefinitionId, encrypted_values AS EncryptedValues,
                   status AS Status, n8n_credential_id AS N8nCredentialId, verified_at AS VerifiedAt,
                   created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM UserServiceCredentials
            WHERE user_service_id = @userServiceId AND integration_definition_id = @integrationDefinitionId
            """, new { userServiceId, integrationDefinitionId });
    }

    public async Task<IReadOnlyList<UserServiceCredential>> GetByUserServiceIdAsync(int userServiceId)
    {
        using var connection = db.GetConnection();
        var values = await connection.QueryAsync<UserServiceCredential>(
            """
            SELECT id AS Id, user_service_id AS UserServiceId, company_id AS CompanyId,
                   integration_definition_id AS IntegrationDefinitionId, encrypted_values AS EncryptedValues,
                   status AS Status, n8n_credential_id AS N8nCredentialId, verified_at AS VerifiedAt,
                   created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM UserServiceCredentials
            WHERE user_service_id = @userServiceId
            """, new { userServiceId });
        return values.ToArray();
    }

    public async Task UpsertAsync(UserServiceCredential credential)
    {
        using var connection = db.GetConnection();
        await connection.ExecuteAsync(
            """
            INSERT INTO UserServiceCredentials
              (user_service_id, company_id, integration_definition_id, encrypted_values, status, n8n_credential_id, verified_at)
            VALUES
              (@UserServiceId, @CompanyId, @IntegrationDefinitionId, @EncryptedValues, @Status, @N8nCredentialId, @VerifiedAt)
            ON DUPLICATE KEY UPDATE
              encrypted_values = VALUES(encrypted_values),
              status = VALUES(status),
              n8n_credential_id = COALESCE(VALUES(n8n_credential_id), n8n_credential_id),
              verified_at = VALUES(verified_at)
            """, credential);
    }
}
