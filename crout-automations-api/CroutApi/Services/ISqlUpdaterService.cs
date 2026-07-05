using CroutApi.DTOs;

namespace CroutApi.Services;

public interface ISqlUpdaterService
{
    Task<SqlUpdaterSummaryDto> RunCurrentEnvironmentAsync(CancellationToken cancellationToken = default);
}
