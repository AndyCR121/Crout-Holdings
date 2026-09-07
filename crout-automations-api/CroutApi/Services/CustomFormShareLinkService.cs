using CroutApi.DTOs;
using CroutApi.Models;
using CroutApi.Repositories;
using Microsoft.Extensions.Options;

namespace CroutApi.Services;

public class CustomFormShareLinkService(
    ICustomFormShareLinkRepository links,
    IIntegrationRepository integrations,
    IUserServiceRepository userServices,
    IOptions<CustomFormShareLinkOptions> options) : ICustomFormShareLinkService
{
    public async Task<CustomFormShareLinkStatusDto> GetStatusAsync(int userId, int companyId, int userServiceId)
    {
        await RequireServiceAccessAsync(userId, companyId, userServiceId);

        var link = await links.GetActiveByUserServiceIdAsync(userServiceId);
        if (link is null)
            return new CustomFormShareLinkStatusDto { Exists = false };

        var isOwner = link.CreatedByUserId == userId;
        if (!isOwner)
            return new CustomFormShareLinkStatusDto { Exists = true, IsOwner = false };

        var (lastUsedAtUtc, submissionCount) = await links.GetUsageAsync(link.ShareLinkId);
        return new CustomFormShareLinkStatusDto
        {
            Exists = true,
            IsOwner = true,
            CreatedAtUtc = link.CreatedAt,
            ExpiresAtUtc = link.ExpiresAt,
            RevokedAtUtc = link.RevokedAt,
            LastUsedAtUtc = lastUsedAtUtc,
            SubmissionCount = submissionCount
        };
    }

    public async Task<CustomFormShareLinkGeneratedDto> GenerateAsync(int userId, int companyId, int userServiceId)
    {
        await RequireServiceAccessAsync(userId, companyId, userServiceId);

        var userService = await userServices.GetByIdAsync(userServiceId)
            ?? throw new UnauthorizedAccessException("Service is not available.");
        if (!CustomFormTriggerEligibility.HasConfirmedCustomFormTrigger(userService.Config))
            throw new UnauthorizedAccessException("This service does not have a confirmed Custom Form trigger.");

        // Replace-on-regenerate: an existing active link (regardless of who generated it,
        // since this call already proved the caller owns the *service*) is superseded here.
        await links.RevokeActiveByUserServiceIdAsync(userServiceId);

        var rawToken = ShareLinkTokens.GenerateRawToken();
        var now = DateTime.UtcNow;
        var link = new CustomFormShareLink
        {
            UserServiceId = userServiceId,
            CreatedByUserId = userId,
            TokenHash = ShareLinkTokens.Hash(rawToken),
            CreatedAt = now,
            ExpiresAt = now.AddDays(options.Value.ExpiryDays)
        };
        await links.CreateAsync(link);

        var baseUrl = options.Value.AppBaseUrl.TrimEnd('/');
        return new CustomFormShareLinkGeneratedDto
        {
            Url = $"{baseUrl}/forms/{rawToken}",
            CreatedAtUtc = link.CreatedAt,
            ExpiresAtUtc = link.ExpiresAt
        };
    }

    public async Task RevokeAsync(int userId, int companyId, int userServiceId)
    {
        await RequireServiceAccessAsync(userId, companyId, userServiceId);

        var link = await links.GetActiveByUserServiceIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("No active share link for this service.");
        if (link.CreatedByUserId != userId)
            throw new UnauthorizedAccessException("Only the user who generated this link may revoke it.");

        await links.RevokeActiveByUserServiceIdAsync(userServiceId);
    }

    /// <summary>Matches the ownership check ServiceTriggerService.ExecuteAsync already uses for this service's Custom Form context.</summary>
    private async Task<CustomFormAccessContextDto> RequireServiceAccessAsync(int userId, int companyId, int userServiceId)
    {
        var context = await integrations.GetCustomFormContextByUserServiceIdAsync(userServiceId);
        if (context is null || context.CompanyOwnerUserId != userId || context.CompanyId != companyId)
            throw new UnauthorizedAccessException("Service is not available for this user.");
        return context;
    }
}
