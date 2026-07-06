using CroutApi.DTOs;

namespace CroutApi.Services.SchemaSync;

public interface ISchemaSyncPlanService
{
    Task<SchemaComparisonResponseDto> CompareAsync(SchemaComparisonRequestDto request, CancellationToken cancellationToken = default);
    Task<SchemaSyncPlanDto> CreatePlanAsync(SchemaComparisonRequestDto request, CancellationToken cancellationToken = default);
    Task<SchemaSyncPlanDto> GenerateMigrationAsync(GenerateSchemaSyncMigrationRequestDto request, CancellationToken cancellationToken = default);
}
