using System.ComponentModel.DataAnnotations;
using CroutApi.DTOs;
using CroutApi.Models;
using CroutApi.Repositories;
using Microsoft.Extensions.Options;

namespace CroutApi.Services;

public class CustomFormShareLinkService(
    ICustomFormShareLinkRepository links,
    IIntegrationRepository integrations,
    IUserServiceRepository userServices,
    ICompanyRepository companies,
    IServiceRepository services,
    IEmailService emailer,
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
        var recipients = link.ShareMethod == CustomFormShareMethods.Email
            ? (await links.GetRecipientEmailsAsync(link.ShareLinkId)).ToList()
            : null;
        return new CustomFormShareLinkStatusDto
        {
            Exists = true,
            IsOwner = true,
            CreatedAtUtc = link.CreatedAt,
            ExpiresAtUtc = link.ExpiresAt,
            RevokedAtUtc = link.RevokedAt,
            LastUsedAtUtc = lastUsedAtUtc,
            SubmissionCount = submissionCount,
            ShareMethod = link.ShareMethod,
            RecipientEmails = recipients
        };
    }

    public async Task<CustomFormShareLinkGeneratedDto> GenerateAsync(int userId, int companyId, int userServiceId, GenerateCustomFormShareLinkRequestDto request)
    {
        var context = await RequireServiceAccessAsync(userId, companyId, userServiceId);

        var userService = await userServices.GetByIdAsync(userServiceId)
            ?? throw new UnauthorizedAccessException("Service is not available.");
        if (!CustomFormTriggerEligibility.HasConfirmedCustomFormTrigger(userService.Config))
            throw new UnauthorizedAccessException("This service does not have a confirmed Custom Form trigger.");
        // A confirmed trigger only means the add-on was approved — the developer still has to
        // build the actual form fields, and either explicitly publish them or have the
        // integration already Live (see CustomFormPublishEligibility), before there's anything
        // for PublicFormAccessService to resolve. Without this check a link generates (and can
        // be emailed) successfully but is guaranteed to 404 for every recipient.
        if (!CustomFormPublishEligibility.HasUsableSchema(context))
            throw new UnauthorizedAccessException("This form hasn't been built yet, and the integration isn't Live. Ask your developer to finish building (and, unless it's already Live, publish) the form before generating a share link.");

        var shareMethod = request.ShareMethod?.Trim().ToLowerInvariant();
        if (shareMethod != CustomFormShareMethods.Url && shareMethod != CustomFormShareMethods.Email)
            throw new ArgumentException("Share method must be 'url' or 'email'.");

        if (request.ValidityDays < ShareLinkValidityLimits.MinDays || request.ValidityDays > ShareLinkValidityLimits.MaxDays)
            throw new ArgumentException($"Validity must be between {ShareLinkValidityLimits.MinDays} and {ShareLinkValidityLimits.MaxDays} days.");

        var recipients = new List<string>();
        if (shareMethod == CustomFormShareMethods.Email)
        {
            recipients = (request.RecipientEmails ?? [])
                .Select(e => e?.Trim() ?? string.Empty)
                .Where(e => e.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (recipients.Count == 0)
                throw new ArgumentException("At least one recipient email is required for the Email share method.");

            var emailValidator = new EmailAddressAttribute();
            var invalid = recipients.Where(e => !emailValidator.IsValid(e)).ToList();
            if (invalid.Count > 0)
                throw new ArgumentException($"Invalid recipient email address: {string.Join(", ", invalid)}");
        }

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
            ExpiresAt = now.AddDays(request.ValidityDays),
            ShareMethod = shareMethod
        };
        var shareLinkId = await links.CreateAsync(link);

        var baseUrl = options.Value.AppBaseUrl.TrimEnd('/');
        var url = $"{baseUrl}/forms/{rawToken}";

        if (shareMethod == CustomFormShareMethods.Email)
        {
            await links.AddRecipientsAsync(shareLinkId, recipients);

            var company = await companies.GetByIdAsync(companyId);
            var service = await services.GetByIdAsync(userService.ServiceId);
            var companyName = company?.CompanyName ?? string.Empty;
            var serviceName = service?.ServiceName ?? string.Empty;
            foreach (var recipient in recipients)
                await emailer.SendFormShareLinkAsync(recipient, url, companyName, serviceName);
        }

        return new CustomFormShareLinkGeneratedDto
        {
            ShareMethod = shareMethod,
            Url = shareMethod == CustomFormShareMethods.Url ? url : null,
            RecipientEmails = shareMethod == CustomFormShareMethods.Email ? recipients : null,
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

    public Task InvalidateForDeactivatedServiceAsync(int userServiceId) =>
        links.RevokeActiveByUserServiceIdAsync(userServiceId);

    /// <summary>Matches the ownership check ServiceTriggerService.ExecuteAsync already uses for this service's Custom Form context.</summary>
    private async Task<CustomFormAccessContextDto> RequireServiceAccessAsync(int userId, int companyId, int userServiceId)
    {
        var context = await integrations.GetCustomFormContextByUserServiceIdAsync(userServiceId);
        if (context is null || context.CompanyOwnerUserId != userId || context.CompanyId != companyId)
            throw new UnauthorizedAccessException("Service is not available for this user.");
        return context;
    }
}
