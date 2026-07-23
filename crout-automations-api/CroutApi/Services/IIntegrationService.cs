using CroutApi.DTOs;

namespace CroutApi.Services;

public interface IIntegrationService
{
    Task<IntegrationSummaryDto> EnsureProvisionedAsync(int userServiceId, CancellationToken cancellationToken = default);
    Task<IntegrationSummaryDto> SynchronizeAsync(int userServiceId, CancellationToken cancellationToken = default);
    Task<IntegrationStatusDto> GetStatusAsync(int userServiceId, CancellationToken cancellationToken = default);
    Task<IntegrationSummaryDto> PublishAsync(int userServiceId, int callerUserId, CancellationToken cancellationToken = default);
    Task<IntegrationSummaryDto> PauseAsync(int userServiceId, int callerUserId, CancellationToken cancellationToken = default);
    Task<IntegrationSummaryDto> StartAsync(int userServiceId, int callerUserId, CancellationToken cancellationToken = default);
}
