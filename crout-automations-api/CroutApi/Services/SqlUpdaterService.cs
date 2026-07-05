using CroutApi.DTOs;
using CroutApi.Helpers;

namespace CroutApi.Services;

public class SqlUpdaterService(ILogger<SqlUpdaterService> logger, IHostEnvironment environment) : ISqlUpdaterService
{
    public async Task<SqlUpdaterSummaryDto> RunCurrentEnvironmentAsync(CancellationToken cancellationToken = default)
    {
        var result = await SchemaUpdater.RunCurrentEnvironmentAsync(
            new SchemaUpdaterExecutionOptions
            {
                DryRun = false,
                AllowProduction = false,
                EnvironmentName = environment.EnvironmentName
            },
            logger,
            cancellationToken);

        return result.ToDto();
    }
}
