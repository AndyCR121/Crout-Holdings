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

    /// <summary>
    /// Sets Integration.Status directly, bypassing any n8n call/verification. An operator
    /// override for unsticking a status (most commonly Failed) that a real Publish/Pause/Start
    /// round-trip can't currently resolve (e.g. n8n unreachable or missing credentials locally).
    /// Clears any stale LastError. Does not touch the actual n8n workflow's active/inactive
    /// state, so the two can drift — this is a deliberate escape hatch, not a substitute for
    /// the verified lifecycle actions above.
    /// </summary>
    Task<IntegrationSummaryDto> SetStatusAsync(int userServiceId, string status, int callerUserId, CancellationToken cancellationToken = default);
}
