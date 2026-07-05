using CroutApi.DTOs;

namespace CroutApi.Services;

public interface IDatabaseManagementService
{
    Task<IReadOnlyList<DatabaseManagementTargetDto>> GetTargetsAsync(CancellationToken cancellationToken = default);
    Task<SqlUpdatePreviewDto> GetSqlUpdatePreviewAsync(string targetKey, CancellationToken cancellationToken = default);
    Task<SqlUpdaterSummaryDto?> GetLatestSqlUpdateResultAsync(string targetKey, CancellationToken cancellationToken = default);
    Task<SqlUpdaterSummaryDto> RunSqlUpdateAsync(RunSqlUpdateRequestDto request, CancellationToken cancellationToken = default);
    Task<DatabaseMigrationValidationDto> ValidateMigrationAsync(ValidateDatabaseMigrationRequestDto request, CancellationToken cancellationToken = default);
    Task<DatabaseMigrationOperationDto> StartMigrationAsync(StartDatabaseMigrationRequestDto request, CancellationToken cancellationToken = default);
    Task<DatabaseMigrationOperationDto?> GetMigrationStatusAsync(string operationId, CancellationToken cancellationToken = default);
}
