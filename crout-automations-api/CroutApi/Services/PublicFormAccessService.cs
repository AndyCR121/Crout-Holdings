using CroutApi.DTOs;
using CroutApi.DTOs.ServiceTriggers;
using CroutApi.Models;
using CroutApi.Repositories;

namespace CroutApi.Services;

public class PublicFormAccessService(
    ICustomFormShareLinkRepository links,
    IIntegrationRepository integrations,
    ICompanyRepository companies,
    IServiceRepository services,
    IServiceTriggerService triggers) : IPublicFormAccessService
{
    public async Task<PublicCustomFormDto?> ResolveAsync(string rawToken)
    {
        var resolved = await ResolveLinkAndContextAsync(rawToken);
        if (resolved is null) return null;
        var (link, _, context) = resolved.Value;

        await links.CreateAccessAsync(new CustomFormShareLinkAccess
        {
            ShareLinkId = link.ShareLinkId,
            Action = CustomFormShareLinkAccessActions.View
        });

        var config = triggers.BuildPublicCustomFormConfig(context);
        if (config is null) return null; // defensive — schema became unparseable/unavailable between checks

        var company = await companies.GetByIdAsync(context.CompanyId);
        var service = await services.GetByIdAsync(context.ServiceId);

        return new PublicCustomFormDto
        {
            CompanyName = company?.CompanyName ?? string.Empty,
            ServiceName = service?.ServiceName ?? string.Empty,
            Config = config
        };
    }

    public async Task<ExecuteTriggerResponseDto?> SubmitAsync(string rawToken, string? payloadJson)
    {
        var resolved = await ResolveLinkAndContextAsync(rawToken);
        if (resolved is null) return null;
        var (link, integration, context) = resolved.Value;

        var result = await triggers.ExecutePublicCustomFormAsync(integration, context, payloadJson);

        await links.CreateAccessAsync(new CustomFormShareLinkAccess
        {
            ShareLinkId = link.ShareLinkId,
            Action = CustomFormShareLinkAccessActions.Submit,
            ServiceTriggerExecutionId = result.ExecutionId
        });

        return result;
    }

    /// <summary>
    /// Single uniform gate for every invalid case (R9): a token that never existed, is
    /// expired, is revoked, or resolves to a form that has never been published all return
    /// null here — the controller never sees which case it was.
    /// </summary>
    private async Task<(CustomFormShareLink Link, Integration Integration, CustomFormAccessContextDto Context)?> ResolveLinkAndContextAsync(string rawToken)
    {
        var tokenHash = ShareLinkTokens.Hash(rawToken);
        var link = await links.GetActiveByTokenHashAsync(tokenHash);
        if (link is null) return null;

        var context = await integrations.GetCustomFormContextByUserServiceIdAsync(link.UserServiceId);
        if (context is null || string.IsNullOrWhiteSpace(context.PublishedSchemaJson))
            return null;

        var integration = await integrations.GetByIntegrationIdAsync(context.IntegrationId);
        if (integration is null) return null;

        return (link, integration, context);
    }
}
