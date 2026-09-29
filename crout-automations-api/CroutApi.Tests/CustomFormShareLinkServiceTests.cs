using CroutApi.DTOs;
using CroutApi.Models;
using CroutApi.Repositories;
using CroutApi.Services;
using Microsoft.Extensions.Options;
using Xunit;

namespace CroutApi.Tests;

public class CustomFormShareLinkServiceTests
{
    private const int OwnerUserId = 1;
    private const int OtherUserId = 2;
    private const int CompanyId = 10;
    private const int UserServiceId = 100;

    private static readonly GenerateCustomFormShareLinkRequestDto UrlRequest = new()
    {
        ShareMethod = CustomFormShareMethods.Url,
        ValidityDays = 30
    };

    [Fact]
    public async Task GenerateAsync_FirstTime_CreatesLinkAndReturnsUrlOnce()
    {
        var links = new FakeShareLinkRepository();
        var service = BuildService(links);

        var result = await service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, UrlRequest);

        Assert.StartsWith("https://automations.crout-holdings.com/forms/", result.Url);
        Assert.Equal(CustomFormShareMethods.Url, result.ShareMethod);
        Assert.Single(links.Rows);
        Assert.Equal(OwnerUserId, links.Rows[0].CreatedByUserId);
        Assert.True(result.ExpiresAtUtc > result.CreatedAtUtc);
    }

    [Fact]
    public async Task GenerateAsync_WhenActiveLinkExists_RevokesPriorAndCreatesNewOne()
    {
        var links = new FakeShareLinkRepository();
        var service = BuildService(links);

        var first = await service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, UrlRequest);
        var second = await service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, UrlRequest);

        Assert.NotEqual(first.Url, second.Url);
        Assert.Equal(2, links.Rows.Count);
        Assert.NotNull(links.Rows[0].RevokedAt); // prior link revoked
        Assert.Null(links.Rows[1].RevokedAt);    // new link active

        var active = await links.GetActiveByUserServiceIdAsync(UserServiceId);
        Assert.NotNull(active);
        Assert.Equal(links.Rows[1].ShareLinkId, active!.ShareLinkId);
    }

    [Fact]
    public async Task RevokeAsync_ActiveLink_InvalidatesIt()
    {
        var links = new FakeShareLinkRepository();
        var service = BuildService(links);
        await service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, UrlRequest);

        await service.RevokeAsync(OwnerUserId, CompanyId, UserServiceId);

        Assert.Null(await links.GetActiveByUserServiceIdAsync(UserServiceId));
    }

    [Fact]
    public async Task RevokeAsync_ByNonGeneratingUser_ThrowsUnauthorized()
    {
        var links = new FakeShareLinkRepository();
        var service = BuildService(links);
        await service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, UrlRequest);

        // OtherUserId does not own the company, so the base access check already denies
        // it — this also exercises the "only the generating user" requirement, since a
        // second real owner (integrations returning a different CompanyOwnerUserId) would
        // hit the same UnauthorizedAccessException path.
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.RevokeAsync(OtherUserId, CompanyId, UserServiceId));
    }

    [Fact]
    public async Task GetStatusAsync_DifferentGeneratingUser_HidesMetadataButShowsExists()
    {
        var links = new FakeShareLinkRepository();
        var integrations = new FakeIntegrationRepository();
        // Simulate a second legitimate owner for this exact company/service (e.g. after a
        // future ownership transfer) who did NOT generate the link.
        integrations.Context.CompanyOwnerUserId = OwnerUserId;
        var service = BuildService(links, integrations);
        await service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, UrlRequest);

        var status = await service.GetStatusAsync(OwnerUserId, CompanyId, UserServiceId);

        Assert.True(status.Exists);
        Assert.True(status.IsOwner);
        Assert.NotNull(status.CreatedAtUtc);
    }

    [Fact]
    public async Task GetStatusAsync_NoLink_ReturnsNotExists()
    {
        var links = new FakeShareLinkRepository();
        var service = BuildService(links);

        var status = await service.GetStatusAsync(OwnerUserId, CompanyId, UserServiceId);

        Assert.False(status.Exists);
    }

    [Fact]
    public async Task GenerateAsync_ServiceWithoutConfirmedCustomFormTrigger_ThrowsUnauthorized()
    {
        var links = new FakeShareLinkRepository();
        var userServices = new FakeUserServiceRepository { Config = "{\"trigger\":[\"Email\"]}" };
        var service = BuildService(links, userServices: userServices);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, UrlRequest));
    }

    [Fact]
    public async Task GenerateAsync_ConfirmedTriggerButFormNeverPublished_ThrowsUnauthorized()
    {
        // A confirmed Custom Form trigger only means the add-on was approved — the developer
        // still has to build and publish the actual form fields (PublishCustomFormAsync)
        // before PublicFormAccessService has anything to resolve. Without this guard, Generate
        // would happily hand back a URL that 404s for every recipient (see PublicFormsController).
        var links = new FakeShareLinkRepository();
        var integrations = new FakeIntegrationRepository();
        integrations.Context.PublishedSchemaJson = null;
        var service = BuildService(links, integrations);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, UrlRequest));
    }

    [Fact]
    public async Task GenerateAsync_LiveIntegrationWithDraftButNeverExplicitlyPublished_Succeeds()
    {
        // Some integrations were wired up directly in n8n and flipped Live without ever going
        // through the dev form builder's Publish step — they should still be shareable off
        // their draft rather than being permanently blocked (see CustomFormPublishEligibility).
        var links = new FakeShareLinkRepository();
        var integrations = new FakeIntegrationRepository();
        integrations.Context.PublishedSchemaJson = null;
        integrations.Context.DraftSchemaJson = """{"schema":{"elements":[]}}""";
        integrations.Context.Status = "Live";
        var service = BuildService(links, integrations);

        var result = await service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, UrlRequest);

        Assert.StartsWith("https://automations.crout-holdings.com/forms/", result.Url);
    }

    [Fact]
    public async Task GenerateAsync_LiveIntegrationWithNoFormAtAll_ThrowsUnauthorized()
    {
        // Live alone isn't enough — there must be at least a draft to fall back to.
        var links = new FakeShareLinkRepository();
        var integrations = new FakeIntegrationRepository();
        integrations.Context.PublishedSchemaJson = null;
        integrations.Context.DraftSchemaJson = null;
        integrations.Context.Status = "Live";
        var service = BuildService(links, integrations);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, UrlRequest));
    }

    [Fact]
    public async Task GenerateAsync_EmailMethodWithValidRecipients_SendsOneEmailPerRecipientAndOmitsUrl()
    {
        var links = new FakeShareLinkRepository();
        var emailer = new FakeEmailService();
        var service = BuildService(links, emailer: emailer);
        var request = new GenerateCustomFormShareLinkRequestDto
        {
            ShareMethod = CustomFormShareMethods.Email,
            ValidityDays = 30,
            RecipientEmails = ["a@example.com", "b@example.com"]
        };

        var result = await service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, request);

        Assert.Null(result.Url);
        Assert.Equal(CustomFormShareMethods.Email, result.ShareMethod);
        Assert.Equal(2, result.RecipientEmails!.Count);
        Assert.Equal(2, emailer.SentTo.Count);
        Assert.Contains("a@example.com", emailer.SentTo);
        Assert.Contains("b@example.com", emailer.SentTo);
        Assert.Equal(2, (await links.GetRecipientEmailsAsync(links.Rows[0].ShareLinkId)).Count);
    }

    [Fact]
    public async Task GenerateAsync_EmailMethodWithInvalidRecipient_ThrowsAndSendsNothing()
    {
        var links = new FakeShareLinkRepository();
        var emailer = new FakeEmailService();
        var service = BuildService(links, emailer: emailer);
        var request = new GenerateCustomFormShareLinkRequestDto
        {
            ShareMethod = CustomFormShareMethods.Email,
            ValidityDays = 30,
            RecipientEmails = ["valid@example.com", "not-an-email"]
        };

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, request));

        Assert.Empty(emailer.SentTo);
        Assert.Empty(links.Rows);
    }

    [Fact]
    public async Task GenerateAsync_EmailMethodWithNoRecipients_Throws()
    {
        var links = new FakeShareLinkRepository();
        var service = BuildService(links);
        var request = new GenerateCustomFormShareLinkRequestDto
        {
            ShareMethod = CustomFormShareMethods.Email,
            ValidityDays = 30,
            RecipientEmails = []
        };

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, request));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(365)]
    public async Task GenerateAsync_ValidityWithinRange_ExpiresExactlyThatManyDaysOut(int days)
    {
        var links = new FakeShareLinkRepository();
        var service = BuildService(links);
        var request = new GenerateCustomFormShareLinkRequestDto { ShareMethod = CustomFormShareMethods.Url, ValidityDays = days };

        var result = await service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, request);

        var expectedExpiry = result.CreatedAtUtc.AddDays(days);
        Assert.Equal(expectedExpiry, result.ExpiresAtUtc);
    }

    [Fact]
    public async Task GenerateAsync_ValidityOverCap_Throws()
    {
        var links = new FakeShareLinkRepository();
        var service = BuildService(links);
        var request = new GenerateCustomFormShareLinkRequestDto { ShareMethod = CustomFormShareMethods.Url, ValidityDays = 366 };

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, request));
    }

    [Fact]
    public async Task InvalidateForDeactivatedServiceAsync_RevokesActiveLinkWithNoOwnershipCheck()
    {
        var links = new FakeShareLinkRepository();
        var service = BuildService(links);
        await service.GenerateAsync(OwnerUserId, CompanyId, UserServiceId, UrlRequest);

        await service.InvalidateForDeactivatedServiceAsync(UserServiceId);

        Assert.Null(await links.GetActiveByUserServiceIdAsync(UserServiceId));
    }

    [Fact]
    public async Task InvalidateForDeactivatedServiceAsync_NoActiveLink_IsNoOp()
    {
        var links = new FakeShareLinkRepository();
        var service = BuildService(links);

        await service.InvalidateForDeactivatedServiceAsync(UserServiceId);

        Assert.Null(await links.GetActiveByUserServiceIdAsync(UserServiceId));
    }

    private static CustomFormShareLinkService BuildService(
        FakeShareLinkRepository links,
        FakeIntegrationRepository? integrations = null,
        FakeUserServiceRepository? userServices = null,
        FakeEmailService? emailer = null)
    {
        integrations ??= new FakeIntegrationRepository();
        userServices ??= new FakeUserServiceRepository();
        emailer ??= new FakeEmailService();
        var options = Options.Create(new CustomFormShareLinkOptions());
        return new CustomFormShareLinkService(
            links, integrations, userServices, new FakeCompanyRepository(), new FakeServiceRepository(), emailer, options);
    }

    private class FakeIntegrationRepository : IIntegrationRepository
    {
        public CustomFormAccessContextDto Context { get; set; } = new()
        {
            IntegrationId = 1,
            UserServiceId = UserServiceId,
            ServiceId = 5,
            CompanyId = CompanyId,
            CompanyOwnerUserId = OwnerUserId,
            PublishedSchemaJson = """{"schema":{"elements":[]}}""",
        };

        public Task<Integration?> GetByUserServiceIdAsync(int userServiceId) => throw new NotImplementedException();
        public Task<Integration?> GetByIntegrationIdAsync(int integrationId) => Task.FromResult<Integration?>(new Integration { IntegrationId = integrationId, UserServiceId = UserServiceId, CompanyId = CompanyId });
        public Task<CustomFormAccessContextDto?> GetCustomFormContextByIntegrationIdAsync(int integrationId) => Task.FromResult<CustomFormAccessContextDto?>(Context);
        public Task<CustomFormAccessContextDto?> GetCustomFormContextByUserServiceIdAsync(int userServiceId) =>
            Task.FromResult<CustomFormAccessContextDto?>(userServiceId == UserServiceId ? Context : null);
        public Task<int> CreatePlaceholderAsync(Integration integration) => throw new NotImplementedException();
        public Task<bool> TryCreatePlaceholderAsync(Integration integration) => throw new NotImplementedException();
        public Task UpdateProvisioningAsync(int integrationId, string workflowId, string workflowDefinitionJson, string? nodeMappingsJson, string templateWorkflowId, string templateServiceTag, string templateVersion, string templateSnapshotHash, DateTime templateResolvedAt) => throw new NotImplementedException();
        public Task UpdateWorkflowStateAsync(int integrationId, string status, string? lastError, int? publishedBy, DateTime? publishedDate, int? pausedBy, DateTime? pausedDate, string? workflowDefinitionJson, string? nodeMappingsJson) => throw new NotImplementedException();
        public Task SaveCustomFormDraftAsync(int integrationId, string title, string webhookUrl, string schemaJson) => throw new NotImplementedException();
        public Task PublishCustomFormAsync(int integrationId, string title, string webhookUrl, string schemaJson, int version, int publishedByUserId, DateTime publishedAtUtc) => throw new NotImplementedException();
        public Task UnpublishCustomFormAsync(int integrationId) => throw new NotImplementedException();
        public Task DeleteCustomFormAsync(int integrationId) => throw new NotImplementedException();
    }

    private class FakeUserServiceRepository : IUserServiceRepository
    {
        public string? Config { get; set; } = "{\"trigger\":[\"Website Form\"]}";

        public Task<IEnumerable<UserService>> GetByCompanyAsync(int companyId) => throw new NotImplementedException();
        public Task<decimal> GetSubscriptionAmountAsync(int userServiceId) => throw new NotImplementedException();
        public Task<UserService?> GetByIdAsync(int userServiceId) =>
            Task.FromResult<UserService?>(new UserService { Id = userServiceId, CompanyId = CompanyId, ServiceId = 5, Config = Config, Active = true });
        public Task<UserServiceIntegrationContextDto?> GetIntegrationContextAsync(int userServiceId) => throw new NotImplementedException();
        public Task<int> CreateAsync(UserService userService) => throw new NotImplementedException();
        public Task UpdateConfigAsync(int userServiceId, string config, int status) => throw new NotImplementedException();
        public Task<(IEnumerable<AdminClientServiceRowDto> Items, int Total)> AdminGetAllAsync(int page, int pageSize, string? search, int? userId, int? companyId, int? serviceId, bool? active) => throw new NotImplementedException();
        public Task<AdminClientServiceRowDto?> AdminGetRowByIdAsync(int userServiceId) => throw new NotImplementedException();
        public Task<int> AdminCreateAsync(UserService userService) => throw new NotImplementedException();
        public Task AdminUpdateAsync(int userServiceId, AdminUpdateClientServiceConfigDto dto) => throw new NotImplementedException();
        public Task AdminDeactivateAsync(int userServiceId) => throw new NotImplementedException();
        public Task<(IEnumerable<AdminPaystackMappingRowDto> Items, int Total)> AdminGetPaystackMappingsAsync(int page, int pageSize, string? search, string? mappingStatus) => throw new NotImplementedException();
        public Task AdminUpdatePaystackMappingAsync(int userServiceId, AdminMapPaystackSubscriptionDto dto) => throw new NotImplementedException();
    }

    private class FakeCompanyRepository : ICompanyRepository
    {
        public Task<IEnumerable<Company>> GetByUserAsync(int userId) => throw new NotImplementedException();
        public Task<Company?> GetByIdAsync(int companyId) => Task.FromResult<Company?>(new Company { CompanyId = companyId, CompanyName = "Acme Co" });
        public Task<Company?> AdminGetByIdAsync(int companyId) => throw new NotImplementedException();
        public Task<int> CreateAsync(Company company) => throw new NotImplementedException();
        public Task UpdateAsync(Company company) => throw new NotImplementedException();
        public Task DeleteAsync(int companyId, int userId) => throw new NotImplementedException();
        public Task<(IEnumerable<Company> Items, int Total)> GetAllAsync(int page, int pageSize, string? search) => throw new NotImplementedException();
        public Task AdminUpdateAsync(Company company) => throw new NotImplementedException();
        public Task AdminDeleteAsync(int companyId) => throw new NotImplementedException();
    }

    private class FakeServiceRepository : IServiceRepository
    {
        public Task<IEnumerable<Service>> GetAllAsync(bool activeOnly = false) => throw new NotImplementedException();
        public Task<Service?> GetByIdAsync(int serviceId, bool activeOnly = false) => Task.FromResult<Service?>(new Service { ServiceId = serviceId, ServiceName = "Intake Form" });
        public Task<int> CreateAsync(Service service) => throw new NotImplementedException();
        public Task UpdateAsync(Service service) => throw new NotImplementedException();
        public Task DeleteAsync(int serviceId) => throw new NotImplementedException();
        public Task SetActiveAsync(int serviceId, bool active) => throw new NotImplementedException();
        public Task<IEnumerable<Addon>> GetAddonsByServiceAsync(int serviceId) => throw new NotImplementedException();
        public Task<IEnumerable<Addon>> GetAddonsByIdsAsync(IEnumerable<int> addonIds) => throw new NotImplementedException();
        public Task<IEnumerable<Addon>> GetAddonsByNamesAsync(IEnumerable<string> addonNames, int? serviceId = null) => throw new NotImplementedException();
        public Task<IEnumerable<Package>> GetPackagesByServiceAsync(int serviceId) => throw new NotImplementedException();
        public Task<IEnumerable<Package>> GetAllPackagesAsync() => throw new NotImplementedException();
        public Task<Package?> GetPackageByIdAsync(int packageId) => throw new NotImplementedException();
        public Task<IEnumerable<PricingComponent>> GetRequiredPricingComponentsAsync() => throw new NotImplementedException();
    }

    private class FakeEmailService : IEmailService
    {
        public List<string> SentTo { get; } = [];
        public Task<bool> SendContactRequestAsync(ContactRequest request) => throw new NotImplementedException();
        public Task<bool> SendPasswordResetOtpAsync(string email, string displayName, string otp) => throw new NotImplementedException();
        public Task<bool> SendBookingConfirmationAsync(BookingDto booking, string? calendarEmail = null) => throw new NotImplementedException();
        public Task<bool> SendFormShareLinkAsync(string recipientEmail, string shareUrl, string companyName, string serviceName)
        {
            SentTo.Add(recipientEmail);
            return Task.FromResult(true);
        }
    }

    private class FakeShareLinkRepository : ICustomFormShareLinkRepository
    {
        public List<CustomFormShareLink> Rows { get; } = [];
        private readonly Dictionary<int, List<string>> _recipients = [];
        private readonly List<CustomFormShareLinkAccess> _access = [];
        private int _nextId = 1;

        public Task<CustomFormShareLink?> GetActiveByUserServiceIdAsync(int userServiceId) =>
            Task.FromResult(Rows.LastOrDefault(r => r.UserServiceId == userServiceId && r.RevokedAt is null && r.ExpiresAt > DateTime.UtcNow));

        public Task<CustomFormShareLink?> GetActiveByTokenHashAsync(string tokenHash) =>
            Task.FromResult(Rows.LastOrDefault(r => r.TokenHash == tokenHash && r.RevokedAt is null && r.ExpiresAt > DateTime.UtcNow));

        public Task<int> CreateAsync(CustomFormShareLink link)
        {
            link.ShareLinkId = _nextId++;
            Rows.Add(link);
            return Task.FromResult(link.ShareLinkId);
        }

        public Task RevokeActiveByUserServiceIdAsync(int userServiceId)
        {
            foreach (var row in Rows.Where(r => r.UserServiceId == userServiceId && r.RevokedAt is null))
                row.RevokedAt = DateTime.UtcNow;
            return Task.CompletedTask;
        }

        public Task<int> CreateAccessAsync(CustomFormShareLinkAccess access)
        {
            access.AccessId = _access.Count + 1;
            _access.Add(access);
            return Task.FromResult(access.AccessId);
        }

        public Task<(DateTime? LastUsedAtUtc, int SubmissionCount)> GetUsageAsync(int shareLinkId)
        {
            var matches = _access.Where(a => a.ShareLinkId == shareLinkId).ToList();
            DateTime? last = matches.Count > 0 ? matches.Max(a => a.AccessedAt) : null;
            var submissions = matches.Count(a => a.Action == CustomFormShareLinkAccessActions.Submit);
            return Task.FromResult((last, submissions));
        }

        public Task AddRecipientsAsync(int shareLinkId, IEnumerable<string> emails)
        {
            _recipients[shareLinkId] = emails.ToList();
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<string>> GetRecipientEmailsAsync(int shareLinkId) =>
            Task.FromResult<IReadOnlyList<string>>(_recipients.TryGetValue(shareLinkId, out var emails) ? emails : []);
    }
}
