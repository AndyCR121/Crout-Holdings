using CroutApi.Models;
using CroutApi.DTOs.Services;
using CroutApi.Repositories;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace CroutApi.Services;

public class ServiceCatalogService(
    IServiceRepository services,
    IUserServiceRepository userServices,
    IDevServiceRepository devServices,
    ICompanyRepository companies,
    IUserRepository users,
    IIntegrationService integrationService,
    IIntegrationDefinitionRepository integrationDefinitions,
    IUserServiceCredentialRepository credentials,
    CroutApi.Helpers.SensitiveDataProtector protector) : IServiceCatalogService
{
    public Task<IEnumerable<DeveloperReferralOptionDto>> GetDeveloperReferralOptionsAsync() => users.GetActiveDeveloperReferralOptionsAsync();
    public Task<IEnumerable<Service>>    GetServicesAsync()                      => services.GetAllAsync(activeOnly: true);
    public Task<Service?>                GetServiceByIdAsync(int serviceId)      => services.GetByIdAsync(serviceId, activeOnly: true);
    public Task<IEnumerable<Addon>>      GetAddonsByServiceAsync(int id)         => services.GetAddonsByServiceAsync(id);
    public Task<IEnumerable<PricingComponent>> GetRequiredPricingComponentsAsync() => services.GetRequiredPricingComponentsAsync();
    public Task<IEnumerable<Package>>    GetPackagesByServiceAsync(int id)       => services.GetPackagesByServiceAsync(id);
    public Task<IEnumerable<Package>>    GetAllPackagesAsync()                   => services.GetAllPackagesAsync();
    public Task<IEnumerable<UserService>> GetUserServicesAsync(int companyId)    => userServices.GetByCompanyAsync(companyId);

    public async Task<IEnumerable<UserService>> GetUserServicesAsync(int userId, int companyId)
    {
        var company = await companies.GetByIdAsync(companyId)
            ?? throw new KeyNotFoundException("Company not found.");
        if (company.UserId != userId)
            throw new UnauthorizedAccessException("Company does not belong to this user.");
        return await userServices.GetByCompanyAsync(companyId);
    }

    public async Task<UserService> CreateUserServiceAsync(int userId, CreateUserServiceFromConfigDto dto)
    {
        var company = await companies.GetByIdAsync(dto.CompanyId)
            ?? throw new KeyNotFoundException("Company not found.");
        if (company.UserId != userId)
            throw new UnauthorizedAccessException("Company does not belong to this user.");

        var service = await services.GetByIdAsync(dto.ServiceId, activeOnly: true)
            ?? throw new KeyNotFoundException("Service not found.");

        Package? package = null;
        if (dto.PackageId is not null)
        {
            package = await services.GetPackageByIdAsync(dto.PackageId.Value)
                ?? throw new KeyNotFoundException("Package not found.");
        }

        var activeServiceIds = await ResolvePackageServiceIdsAsync(package, dto.ServiceId);
        if (package is not null && !activeServiceIds.Contains(dto.ServiceId))
            throw new ArgumentException("Selected package does not include this service.");

        var addonIds = (dto.AddonIds ?? []).Distinct().ToArray();
        var selectedAddons = (await services.GetAddonsByIdsAsync(addonIds)).ToList();
        if (selectedAddons.Count != addonIds.Length)
            throw new ArgumentException("One or more add-ons could not be found.");
        if (selectedAddons.Any(addon => !addon.IsActive))
            throw new ArgumentException("Inactive add-ons cannot be newly selected.");

        var invalidAddon = selectedAddons.FirstOrDefault(addon => !addon.ServiceIds.Any(activeServiceIds.Contains));
        if (invalidAddon is not null)
            throw new ArgumentException($"Add-on '{invalidAddon.AddonName}' does not belong to the selected service package.");

        var packageServiceResults = await Task.WhenAll(activeServiceIds.Select(id => services.GetByIdAsync(id, activeOnly: true)));
        if (packageServiceResults.Any(serviceItem => serviceItem is null))
            throw new ArgumentException("Selected package includes an unavailable service.");
        var packageServices = packageServiceResults.Select(serviceItem => serviceItem!).ToList();

        var requiredComponents = (await services.GetRequiredPricingComponentsAsync()).ToList();
        var basePrice = packageServices.Count > 0 ? packageServices.Sum(GetServiceMonthlyPrice) : GetServiceMonthlyPrice(service);
        var addonTotal = selectedAddons.Sum(addon => addon.MonthlyPrice);
        var requiredTotal = requiredComponents.Sum(c => c.Amount);
        var fullTotal = basePrice + addonTotal + requiredTotal;

        var discount = package?.Discount ?? 0m;
        var minimumAddons = package?.MinimumRequiredAddons ?? 0;
        var discountUnlocked = package is not null && (minimumAddons == 0 || selectedAddons.Count >= minimumAddons);
        var total = discountUnlocked
            ? Math.Round(fullTotal * (1 - discount), 2, MidpointRounding.AwayFromZero)
            : fullTotal;
        var referral = string.IsNullOrWhiteSpace(dto.Referral) ? null : dto.Referral.Trim();
        User? referredDeveloper = null;
        if (referral is not null)
        {
            referredDeveloper = await users.GetActiveDeveloperByReferralAsync(referral);
            if (referredDeveloper is null)
                throw new ArgumentException("Selected developer referral is no longer valid.");
        }

        var requestedAddonSnapshots = selectedAddons
            .OrderBy(addon => addon.Type)
            .ThenBy(addon => addon.DisplayOrder)
            .ThenBy(addon => addon.AddonName)
            .Select(addon => BuildAddonSnapshot(addon, confirmed: false))
            .ToList();

        var config = new
        {
            serviceId = service.ServiceId,
            serviceName = service.ServiceName,
            packageId = package?.PackageId,
            packageName = package?.PackageName,
            addonIds,
            requestedAddons = requestedAddonSnapshots,
            confirmedAddons = Array.Empty<object>(),
            integrations = requestedAddonSnapshots.Select(addon => new { name = addon.name, confirmed = false, category = addon.type.ToLowerInvariant() }),
            trigger = Array.Empty<string>(),
            action = Array.Empty<string>(),
            output = Array.Empty<string>(),
            referral,
            requestNote = string.IsNullOrWhiteSpace(dto.RequestNote) ? null : dto.RequestNote.Trim()
        };

        var pricingSnapshot = new
        {
            selectedServices = packageServices.Select(s => new
            {
                s.ServiceId,
                s.ServiceName,
                s.BaseCost,
                s.TokensCost,
                s.TotalTokens,
                amount = GetServiceMonthlyPrice(s)
            }),
            selectedPackage = package is null ? null : new { package.PackageId, package.PackageName, discount, minimumAddons, discountUnlocked },
            requiredComponents = requiredComponents.Select(c => new { c.ComponentKey, c.ComponentName, amount = c.Amount }),
            selectedAddons = requestedAddonSnapshots,
            basePrice,
            addonTotal,
            requiredTotal,
            fullTotal,
            discountApplied = discountUnlocked ? discount : 0m,
            total
        };

        var userService = new UserService
        {
            CompanyId = dto.CompanyId,
            ServiceId = dto.ServiceId,
            PackageId = dto.PackageId,
            Config = JsonSerializer.Serialize(config),
            SubscriptionAmount = total,
            PricingSnapshot = JsonSerializer.Serialize(pricingSnapshot),
            PaymentDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(30),
            Active = true,
            Status = 3
        };

        var id = await userServices.CreateAsync(userService);
        if (referredDeveloper is not null)
        {
            await devServices.CreateWithSubscriptionSnapshotAsync(
                referredDeveloper.UserId,
                id,
                commissionPerc: 20.00m);
        }

        var created = await userServices.GetByIdAsync(id);
        if (created is not null) return created;

        userService.Id = id;
        return userService;
    }

    public async Task<UserService> RequestConfigChangeAsync(int userId, int userServiceId, RequestServiceConfigChangeDto dto)
    {
        var userService = await userServices.GetByIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("User service not found.");
        var company = await companies.GetByIdAsync(userService.CompanyId)
            ?? throw new KeyNotFoundException("Company not found.");
        if (company.UserId != userId)
            throw new UnauthorizedAccessException("Company does not belong to this user.");

        var package = userService.PackageId is null
            ? null
            : await services.GetPackageByIdAsync(userService.PackageId.Value);
        var validServiceIds = await ResolvePackageServiceIdsAsync(package, userService.ServiceId);

        var addonIds = (dto.AddonIds ?? []).Distinct().ToArray();
        var selectedAddons = (await services.GetAddonsByIdsAsync(addonIds)).ToList();
        if (selectedAddons.Count != addonIds.Length)
            throw new ArgumentException("One or more add-ons could not be found.");
        if (selectedAddons.Any(addon => !addon.IsActive))
            throw new ArgumentException("Inactive add-ons cannot be newly selected.");

        var invalidAddon = selectedAddons.FirstOrDefault(addon => !addon.ServiceIds.Any(validServiceIds.Contains));
        if (invalidAddon is not null)
            throw new ArgumentException($"Add-on '{invalidAddon.AddonName}' does not belong to the selected service package.");

        var existingConfig = ParseConfig(userService.Config);
        var existingConfirmedAddons = ParseAddonSnapshots(existingConfig["confirmedAddons"]);
        var requestedAddonSnapshots = selectedAddons
            .OrderBy(addon => addon.Type)
            .ThenBy(addon => addon.DisplayOrder)
            .ThenBy(addon => addon.AddonName)
            .Select(addon => BuildAddonSnapshot(
                addon,
                existingConfirmedAddons.Any(existing => existing.addonId == addon.AddonId && existing.confirmed)))
            .ToList();
        var confirmedSnapshots = requestedAddonSnapshots.Where(snapshot => snapshot.confirmed).ToList();

        var config = new
        {
            userService.ServiceId,
            userService.PackageId,
            addonIds,
            requestedAddons = requestedAddonSnapshots,
            confirmedAddons = confirmedSnapshots,
            integrations = requestedAddonSnapshots.Select(addon => new
            {
                name = addon.name,
                confirmed = addon.confirmed,
                category = addon.type.ToLowerInvariant()
            }),
            trigger = confirmedSnapshots.Where(addon => addon.type.Equals(WorkflowRoles.Trigger, StringComparison.OrdinalIgnoreCase)).Select(addon => addon.name).ToArray(),
            action = confirmedSnapshots.Where(addon => addon.type.Equals(WorkflowRoles.Action, StringComparison.OrdinalIgnoreCase)).Select(addon => addon.name).ToArray(),
            output = confirmedSnapshots.Where(addon => addon.type.Equals(WorkflowRoles.Output, StringComparison.OrdinalIgnoreCase)).Select(addon => addon.name).ToArray(),
            notes = new
            {
                trigger = dto.TriggerNotes,
                action = dto.ActionNotes,
                output = dto.OutputNotes
            },
            requestedAt = DateTime.UtcNow
        };

        await userServices.UpdateConfigAsync(userServiceId, JsonSerializer.Serialize(config), status: 3);
        return await userServices.GetByIdAsync(userServiceId) ?? userService;
    }

    public async Task<UserService> UpdateCredentialsAsync(int userId, int userServiceId, UpdateServiceCredentialsDto dto)
    {
        var userService = await userServices.GetByIdAsync(userServiceId)
            ?? throw new KeyNotFoundException("User service not found.");
        var company = await companies.GetByIdAsync(userService.CompanyId)
            ?? throw new KeyNotFoundException("Company not found.");
        if (company.UserId != userId)
            throw new UnauthorizedAccessException("Company does not belong to this user.");

        var integrationName = string.IsNullOrWhiteSpace(dto.IntegrationName)
            ? throw new ArgumentException("Integration is required.")
            : dto.IntegrationName.Trim();
        var fields = (dto.Fields ?? [])
            .Where(pair => !string.IsNullOrWhiteSpace(pair.Key) && !string.IsNullOrWhiteSpace(pair.Value))
            .ToDictionary(pair => pair.Key.Trim(), pair => pair.Value, StringComparer.OrdinalIgnoreCase);

        var config = ParseConfig(userService.Config);
        var confirmedIntegrationNames = (config["confirmedAddons"] as JsonArray ?? [])
            .OfType<JsonObject>()
            .SelectMany(addon => (addon["integrations"] as JsonArray ?? [])
                .OfType<JsonObject>()
                .Select(integration => integration["integrationName"]?.GetValue<string>()))
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (confirmedIntegrationNames.Count > 0 && !confirmedIntegrationNames.Contains(integrationName))
            throw new ArgumentException("Credentials can only be submitted for confirmed add-on integrations.");

        var definition = (await integrationDefinitions.GetAllAsync(activeOnly: false))
            .SingleOrDefault(item => string.Equals(item.Name, integrationName, StringComparison.OrdinalIgnoreCase));
        if (definition is null || !definition.IsActive || !definition.HasCredentials)
            throw new ArgumentException("The selected integration does not accept client credentials.");

        var credential = await credentials.GetAsync(userServiceId, definition.Id);
        var storedValues = credential is null
            ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            : DeserializeValues(protector.Unprotect(credential.EncryptedValues));
        foreach (var field in fields) storedValues[field.Key] = field.Value;
        foreach (var field in dto.RemoveFields ?? [])
        {
            if (!string.IsNullOrWhiteSpace(field)) storedValues.Remove(field.Trim());
        }
        if (storedValues.Count == 0)
            throw new ArgumentException("Provide a credential value or remove an existing credential only when another required value remains.");

        await credentials.UpsertAsync(new UserServiceCredential
        {
            UserServiceId = userServiceId,
            CompanyId = company.CompanyId,
            IntegrationDefinitionId = definition.Id,
            EncryptedValues = protector.Protect(JsonSerializer.Serialize(storedValues)),
            Status = "Configured",
            N8nCredentialId = credential?.N8nCredentialId,
            VerifiedAt = null
        });

        var existingCredentials = config["credentialReferences"] as JsonArray ?? [];
        var credentialName = $"{company.CompanyName} | {integrationName}";
        var credentialReference = new JsonObject
        {
            ["integrationName"] = integrationName,
            ["credentialName"] = credentialName,
            ["status"] = "Configured",
            ["fieldNames"] = new JsonArray(storedValues.Keys.Select(k => JsonValue.Create(k)).ToArray<JsonNode?>()),
            ["submittedAt"] = DateTime.UtcNow,
            ["message"] = "Credential values are encrypted at rest. Only readiness metadata is retained in service configuration."
        };

        var updatedCredentials = new JsonArray(
            existingCredentials
                .Where(node => !string.Equals(node?["integrationName"]?.GetValue<string>(), integrationName, StringComparison.OrdinalIgnoreCase))
                .Select(node => node?.DeepClone())
                .Concat([credentialReference])
                .ToArray<JsonNode?>());

        config["credentialReferences"] = updatedCredentials;
        config["credentialsUpdatedAt"] = DateTime.UtcNow;

        await userServices.UpdateConfigAsync(userServiceId, config.ToJsonString(), userService.Status);
        await integrationService.SynchronizeAsync(userServiceId);
        return await userServices.GetByIdAsync(userServiceId) ?? userService;
    }

    private static Dictionary<string, string> DeserializeValues(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json)
                ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }
        catch (JsonException)
        {
            throw new InvalidOperationException("Stored credential data is invalid and must be replaced.");
        }
    }

    private static string[] Normalize(string[]? values) =>
        (values ?? [])
        .Where(v => !string.IsNullOrWhiteSpace(v))
        .Select(v => v.Trim())
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    private static decimal GetServiceMonthlyPrice(Service service) => service.BaseCost + service.TokensCost;

    private static JsonObject ParseConfig(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return [];
        try
        {
            return JsonNode.Parse(raw) as JsonObject ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static List<(int addonId, string name, string type, bool confirmed)> ParseAddonSnapshots(JsonNode? node)
    {
        if (node is not JsonArray array) return [];

        return array
            .OfType<JsonObject>()
            .Select(item => (
                addonId: item["addonId"]?.GetValue<int>() ?? 0,
                name: item["name"]?.GetValue<string>() ?? string.Empty,
                type: item["type"]?.GetValue<string>() ?? WorkflowRoles.Action,
                confirmed: item["confirmed"]?.GetValue<bool>() == true))
            .Where(item => item.addonId > 0 || !string.IsNullOrWhiteSpace(item.name))
            .ToList();
    }

    private async Task<HashSet<int>> ResolvePackageServiceIdsAsync(Package? package, int fallbackServiceId)
    {
        var ids = new HashSet<int>();
        if (package is null)
        {
            ids.Add(fallbackServiceId);
            return ids;
        }

        foreach (var id in package.ServiceIds)
            ids.Add(id);

        if (package.ParentPackageId is not null)
        {
            var parent = await services.GetPackageByIdAsync(package.ParentPackageId.Value);
            if (parent is not null)
            {
                foreach (var id in parent.ServiceIds)
                    ids.Add(id);
            }
        }

        return ids.Count > 0 ? ids : [fallbackServiceId];
    }

    private static string ClassifyIntegration(string name)
    {
        var lower = name.ToLowerInvariant();
        if (lower.Contains("webhook") || lower.Contains("email") || lower.Contains("whatsapp") || lower.Contains("form"))
            return "trigger";
        if (lower.Contains("report") || lower.Contains("dashboard") || lower.Contains("output") || lower.Contains("invoice"))
            return "output";
        return "action";
    }

    private static dynamic BuildAddonSnapshot(Addon addon, bool confirmed) => new
    {
        addonId = addon.AddonId,
        name = addon.AddonName,
        description = addon.AddonDescription,
        type = string.IsNullOrWhiteSpace(addon.Type) ? WorkflowRoles.Action : addon.Type,
        monthlyPrice = addon.MonthlyPrice,
        isActive = addon.IsActive,
        displayOrder = addon.DisplayOrder,
        confirmed,
        integrations = addon.Integrations.Select(integration => new
        {
            integrationId = integration.Id,
            integrationName = integration.Name,
            integrationType = integration.IntegrationType,
            hasCredentials = integration.HasCredentials,
            isActive = integration.IsActive
        }).ToArray()
    };
}
