using System.Text.Json;
using CroutApi.DTOs;
using CroutApi.DTOs.ServiceTriggers;
using CroutApi.Models;
using CroutApi.Repositories;
using CroutApi.Services;
using Xunit;

namespace CroutApi.Tests;

/// <summary>
/// Covers the public-share-link resolve/submit path's spec-critical behavior: R8 (published
/// schema only), R9 (uniform response across never-existed/expired/revoked/unpublished), and
/// the audit-trail access rows (R11). Follows this test project's existing fake-repository
/// pattern (see CustomFormShareLinkServiceTests.cs) rather than a WebApplicationFactory host,
/// since no HTTP-level integration-test harness exists elsewhere in this project.
/// </summary>
public class PublicFormAccessServiceTests
{
    private const int UserServiceId = 100;
    private const string ValidRawToken = "valid-raw-token";
    private const string PublishedSchema = """{"schema":{"elements":[]}}""";

    [Fact]
    public async Task ResolveAsync_ValidToken_ReturnsFormWithBrandingAndRecordsViewAccess()
    {
        var links = new FakeShareLinkRepository();
        var link = ActiveLink();
        links.ByTokenHash[ShareLinkTokens.Hash(ValidRawToken)] = link;
        var service = BuildService(links, publishedSchema: PublishedSchema);

        var result = await service.ResolveAsync(ValidRawToken);

        Assert.NotNull(result);
        Assert.Equal("Acme Co", result!.CompanyName);
        Assert.Equal("Globefurn RFQ Intake", result.ServiceName);
        Assert.Single(links.AccessRows);
        Assert.Equal(CustomFormShareLinkAccessActions.View, links.AccessRows[0].Action);
    }

    [Fact]
    public async Task ResolveAsync_TokenNeverExisted_ReturnsNull()
    {
        var links = new FakeShareLinkRepository(); // nothing registered for any hash
        var service = BuildService(links, publishedSchema: PublishedSchema);

        var result = await service.ResolveAsync("some-token-that-was-never-issued");

        Assert.Null(result);
        Assert.Empty(links.AccessRows);
    }

    [Fact]
    public async Task ResolveAsync_ExpiredToken_ReturnsNull()
    {
        var links = new FakeShareLinkRepository();
        // GetActiveByTokenHashAsync is the sole gate (R9) — the fake mirrors the real
        // repository's contract by simply not returning expired/revoked rows as "active".
        links.ByTokenHash[ShareLinkTokens.Hash(ValidRawToken)] = null;
        var service = BuildService(links, publishedSchema: PublishedSchema);

        var result = await service.ResolveAsync(ValidRawToken);

        Assert.Null(result);
    }

    [Fact]
    public async Task ResolveAsync_UnpublishedForm_ReturnsSameNullAsInvalidToken()
    {
        var links = new FakeShareLinkRepository();
        var link = ActiveLink();
        links.ByTokenHash[ShareLinkTokens.Hash(ValidRawToken)] = link;
        // Link itself is valid, but the form has never been published (R8).
        var service = BuildService(links, publishedSchema: null);

        var result = await service.ResolveAsync(ValidRawToken);

        Assert.Null(result);
        Assert.Empty(links.AccessRows); // never-published never touches the audit trail either
    }

    [Fact]
    public async Task SubmitAsync_ValidToken_ExecutesAndRecordsSubmitAccessLinkedToExecution()
    {
        var links = new FakeShareLinkRepository();
        var link = ActiveLink();
        links.ByTokenHash[ShareLinkTokens.Hash(ValidRawToken)] = link;
        var service = BuildService(links, publishedSchema: PublishedSchema);

        var result = await service.SubmitAsync(ValidRawToken, """{"field1":"value"}""");

        Assert.NotNull(result);
        Assert.Equal(42, result!.ExecutionId);
        Assert.Single(links.AccessRows);
        Assert.Equal(CustomFormShareLinkAccessActions.Submit, links.AccessRows[0].Action);
        Assert.Equal(42, links.AccessRows[0].ServiceTriggerExecutionId);
    }

    [Fact]
    public async Task SubmitAsync_InvalidToken_ReturnsNullWithoutExecutingOrRecording()
    {
        var links = new FakeShareLinkRepository();
        var service = BuildService(links, publishedSchema: PublishedSchema);

        var result = await service.SubmitAsync("never-issued-token", "{}");

        Assert.Null(result);
        Assert.Empty(links.AccessRows);
    }

    private static CustomFormShareLink ActiveLink() => new()
    {
        ShareLinkId = 7,
        UserServiceId = UserServiceId,
        CreatedByUserId = 1,
        TokenHash = ShareLinkTokens.Hash(ValidRawToken),
        CreatedAt = DateTime.UtcNow.AddDays(-1),
        ExpiresAt = DateTime.UtcNow.AddDays(300)
    };

    private static PublicFormAccessService BuildService(FakeShareLinkRepository links, string? publishedSchema)
    {
        var context = new CustomFormAccessContextDto
        {
            IntegrationId = 5,
            UserServiceId = UserServiceId,
            ServiceId = 9,
            CompanyId = 3,
            CompanyOwnerUserId = 1,
            PublishedSchemaJson = publishedSchema
        };
        var integrations = new FakeIntegrationRepository(context);
        var companies = new FakeCompanyRepository();
        var services = new FakeServiceRepository();
        var triggers = new FakeServiceTriggerService();
        return new PublicFormAccessService(links, integrations, companies, services, triggers);
    }

    private class FakeShareLinkRepository : ICustomFormShareLinkRepository
    {
        public Dictionary<string, CustomFormShareLink?> ByTokenHash { get; } = [];
        public List<CustomFormShareLinkAccess> AccessRows { get; } = [];

        public Task<CustomFormShareLink?> GetActiveByUserServiceIdAsync(int userServiceId) => throw new NotImplementedException();

        public Task<CustomFormShareLink?> GetActiveByTokenHashAsync(string tokenHash) =>
            Task.FromResult(ByTokenHash.TryGetValue(tokenHash, out var link) ? link : null);

        public Task<int> CreateAsync(CustomFormShareLink link) => throw new NotImplementedException();
        public Task RevokeActiveByUserServiceIdAsync(int userServiceId) => throw new NotImplementedException();

        public Task<int> CreateAccessAsync(CustomFormShareLinkAccess access)
        {
            access.AccessId = AccessRows.Count + 1;
            AccessRows.Add(access);
            return Task.FromResult(access.AccessId);
        }

        public Task<(DateTime? LastUsedAtUtc, int SubmissionCount)> GetUsageAsync(int shareLinkId) => throw new NotImplementedException();
    }

    private class FakeIntegrationRepository(CustomFormAccessContextDto context) : IIntegrationRepository
    {
        public Task<Integration?> GetByUserServiceIdAsync(int userServiceId) => throw new NotImplementedException();

        public Task<Integration?> GetByIntegrationIdAsync(int integrationId) =>
            Task.FromResult<Integration?>(new Integration { IntegrationId = integrationId, UserServiceId = UserServiceId, CompanyId = context.CompanyId });

        public Task<CustomFormAccessContextDto?> GetCustomFormContextByIntegrationIdAsync(int integrationId) => throw new NotImplementedException();

        public Task<CustomFormAccessContextDto?> GetCustomFormContextByUserServiceIdAsync(int userServiceId) =>
            Task.FromResult<CustomFormAccessContextDto?>(userServiceId == UserServiceId ? context : null);

        public Task<int> CreatePlaceholderAsync(Integration integration) => throw new NotImplementedException();
        public Task<bool> TryCreatePlaceholderAsync(Integration integration) => throw new NotImplementedException();
        public Task UpdateProvisioningAsync(int integrationId, string workflowId, string workflowDefinitionJson, string? nodeMappingsJson, string templateWorkflowId, string templateServiceTag, string templateVersion, string templateSnapshotHash, DateTime templateResolvedAt) => throw new NotImplementedException();
        public Task UpdateWorkflowStateAsync(int integrationId, string status, string? lastError, int? publishedBy, DateTime? publishedDate, int? pausedBy, DateTime? pausedDate, string? workflowDefinitionJson, string? nodeMappingsJson) => throw new NotImplementedException();
        public Task SaveCustomFormDraftAsync(int integrationId, string title, string webhookUrl, string schemaJson) => throw new NotImplementedException();
        public Task PublishCustomFormAsync(int integrationId, string title, string webhookUrl, string schemaJson, int version, int publishedByUserId, DateTime publishedAtUtc) => throw new NotImplementedException();
        public Task UnpublishCustomFormAsync(int integrationId) => throw new NotImplementedException();
        public Task DeleteCustomFormAsync(int integrationId) => throw new NotImplementedException();
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
        public Task<Service?> GetByIdAsync(int serviceId, bool activeOnly = false) =>
            Task.FromResult<Service?>(new Service { ServiceId = serviceId, ServiceName = "Globefurn RFQ Intake" });
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

    private class FakeServiceTriggerService : IServiceTriggerService
    {
        public Task<IEnumerable<ServiceTriggerConfigDto>> GetConfigsAsync(int userId, int companyId, int serviceId, int? userServiceId = null) => throw new NotImplementedException();
        public Task<ExecuteTriggerResponseDto> ExecuteAsync(int userId, int configId, int companyId, int? userServiceId, string? payloadJson, IEnumerable<string> fileNames) => throw new NotImplementedException();

        public Task<ExecuteTriggerResponseDto> ExecutePublicCustomFormAsync(Integration integration, CustomFormAccessContextDto context, string? payloadJson) =>
            Task.FromResult(new ExecuteTriggerResponseDto(42, "success", "live", "Thanks!", (JsonElement?)null));

        public ServiceTriggerConfigDto? BuildPublicCustomFormConfig(CustomFormAccessContextDto context) =>
            string.IsNullOrWhiteSpace(context.PublishedSchemaJson)
                ? null
                : new ServiceTriggerConfigDto(context.IntegrationId, context.ServiceId, context.UserServiceId, null, "form", "Form", null, "POST", false, null, null, null, "inline");
    }
}
