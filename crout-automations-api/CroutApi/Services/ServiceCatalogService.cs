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
    IIntegrationService integrationService) : IServiceCatalogService
{
    public Task<IEnumerable<DeveloperReferralOptionDto>> GetDeveloperReferralOptionsAsync() => users.GetActiveDeveloperReferralOptionsAsync();
    public Task<IEnumerable<Service>>    GetServicesAsync()                      => services.GetAllAsync();
    public Task<Service?>                GetServiceByIdAsync(int serviceId)      => services.GetByIdAsync(serviceId);
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

        var service = await services.GetByIdAsync(dto.ServiceId)
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

        var invalidAddon = selectedAddons.FirstOrDefault(a => !activeServiceIds.Contains(a.ServiceId));
        if (invalidAddon is not null)
            throw new ArgumentException($"Add-on '{invalidAddon.AddonName}' does not belong to the selected service package.");

        var packageServices = (await Task.WhenAll(activeServiceIds.Select(id => services.GetByIdAsync(id))))
            .Where(s => s is not null)
            .Select(s => s!)
            .ToList();

        var requiredComponents = (await services.GetRequiredPricingComponentsAsync()).ToList();
        var basePrice = packageServices.Count > 0 ? packageServices.Sum(s => s.Price) : service.Price;
        var addonTotal = selectedAddons.Sum(a => a.Price);
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

        var config = new
        {
            serviceId = service.ServiceId,
            serviceName = service.ServiceName,
            packageId = package?.PackageId,
            packageName = package?.PackageName,
            addonIds,
            integrations = selectedAddons.Select(a => new { name = a.AddonName, confirmed = false, category = ClassifyIntegration(a.AddonName) }),
            referral,
            requestNote = string.IsNullOrWhiteSpace(dto.RequestNote) ? null : dto.RequestNote.Trim()
        };

        var pricingSnapshot = new
        {
            selectedServices = packageServices.Select(s => new { s.ServiceId, s.ServiceName, amount = s.Price }),
            selectedPackage = package is null ? null : new { package.PackageId, package.PackageName, discount, minimumAddons, discountUnlocked },
            requiredComponents = requiredComponents.Select(c => new { c.ComponentKey, c.ComponentName, amount = c.Amount }),
            selectedAddons = selectedAddons.Select(a => new { a.AddonId, a.AddonName, amount = a.Price }),
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
        await integrationService.EnsureProvisionedAsync(id);
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

        var invalidAddon = selectedAddons.FirstOrDefault(a => !validServiceIds.Contains(a.ServiceId));
        if (invalidAddon is not null)
            throw new ArgumentException($"Add-on '{invalidAddon.AddonName}' does not belong to the selected service package.");

        var trigger = Normalize(dto.Trigger);
        var action = Normalize(dto.Action);
        var output = Normalize(dto.Output);
        var selectedNames = selectedAddons.Select(a => a.AddonName).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var selectedIntegrationNames = trigger.Concat(action).Concat(output).Concat(selectedNames).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

        var config = new
        {
            userService.ServiceId,
            userService.PackageId,
            addonIds,
            integrations = selectedIntegrationNames.Select(name => new
            {
                name,
                confirmed = false,
                category = trigger.Contains(name, StringComparer.OrdinalIgnoreCase) ? "trigger"
                    : action.Contains(name, StringComparer.OrdinalIgnoreCase) ? "action"
                    : output.Contains(name, StringComparer.OrdinalIgnoreCase) ? "output"
                    : ClassifyIntegration(name)
            }),
            trigger,
            action,
            output,
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

        var service = await services.GetByIdAsync(userService.ServiceId)
            ?? throw new KeyNotFoundException("Service not found.");

        var integrationName = string.IsNullOrWhiteSpace(dto.IntegrationName)
            ? throw new ArgumentException("Integration is required.")
            : dto.IntegrationName.Trim();
        var fields = (dto.Fields ?? [])
            .Where(pair => !string.IsNullOrWhiteSpace(pair.Key) && !string.IsNullOrWhiteSpace(pair.Value))
            .ToDictionary(pair => pair.Key.Trim(), pair => pair.Value, StringComparer.OrdinalIgnoreCase);
        if (fields.Count == 0)
            throw new ArgumentException("At least one credential field is required.");

        var config = ParseConfig(userService.Config);
        var existingCredentials = config["credentialReferences"] as JsonArray ?? [];
        var credentialName = $"{company.CompanyName} | {service.ServiceName} | {integrationName}";
        var credentialReference = new JsonObject
        {
            ["integrationName"] = integrationName,
            ["credentialName"] = credentialName,
            ["mode"] = "mock",
            ["status"] = "queued",
            ["fieldNames"] = new JsonArray(fields.Keys.Select(k => JsonValue.Create(k)).ToArray<JsonNode?>()),
            ["submittedAt"] = DateTime.UtcNow,
            ["message"] = "Credential values were sent through the backend gateway. Local mode stores only metadata and queues n8n credential capture."
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
        return await userServices.GetByIdAsync(userServiceId) ?? userService;
    }

    private static string[] Normalize(string[]? values) =>
        (values ?? [])
        .Where(v => !string.IsNullOrWhiteSpace(v))
        .Select(v => v.Trim())
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

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
}
