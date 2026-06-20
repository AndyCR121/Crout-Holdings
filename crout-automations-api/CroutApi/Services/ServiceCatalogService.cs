using CroutApi.Models;
using CroutApi.DTOs.Services;
using CroutApi.Repositories;
using System.Text.Json;

namespace CroutApi.Services;

public class ServiceCatalogService(
    IServiceRepository services,
    IUserServiceRepository userServices,
    ICompanyRepository companies) : IServiceCatalogService
{
    public Task<IEnumerable<Service>>    GetServicesAsync()                      => services.GetAllAsync();
    public Task<Service?>                GetServiceByIdAsync(int serviceId)      => services.GetByIdAsync(serviceId);
    public Task<IEnumerable<Addon>>      GetAddonsByServiceAsync(int id)         => services.GetAddonsByServiceAsync(id);
    public Task<IEnumerable<Package>>    GetPackagesByServiceAsync(int id)       => services.GetPackagesByServiceAsync(id);
    public Task<IEnumerable<Package>>    GetAllPackagesAsync()                   => services.GetAllPackagesAsync();
    public Task<IEnumerable<UserService>> GetUserServicesAsync(int companyId)    => userServices.GetByCompanyAsync(companyId);

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
            if (!package.ServiceIds.Contains(dto.ServiceId))
                throw new ArgumentException("Selected package does not include this service.");
        }

        var addonIds = (dto.AddonIds ?? []).Distinct().ToArray();
        var selectedAddons = (await services.GetAddonsByIdsAsync(addonIds)).ToList();
        if (selectedAddons.Count != addonIds.Length)
            throw new ArgumentException("One or more add-ons could not be found.");

        var invalidAddon = selectedAddons.FirstOrDefault(a => a.ServiceId != dto.ServiceId);
        if (invalidAddon is not null)
            throw new ArgumentException($"Add-on '{invalidAddon.AddonName}' does not belong to the selected service.");

        var requiredComponents = (await services.GetRequiredPricingComponentsAsync()).ToList();
        var basePrice = service.Price;
        var addonTotal = selectedAddons.Sum(a => a.Price);
        var requiredTotal = requiredComponents.Sum(c => c.Amount);
        var fullTotal = basePrice + addonTotal + requiredTotal;

        var discount = package?.Discount ?? 0m;
        var minimumAddons = package?.MinimumRequiredAddons ?? 0;
        var discountUnlocked = package is not null && (minimumAddons == 0 || selectedAddons.Count >= minimumAddons);
        var total = discountUnlocked
            ? Math.Round(fullTotal * (1 - discount), 2, MidpointRounding.AwayFromZero)
            : fullTotal;

        var config = new
        {
            serviceId = service.ServiceId,
            serviceName = service.ServiceName,
            packageId = package?.PackageId,
            packageName = package?.PackageName,
            addonIds,
            referral = string.IsNullOrWhiteSpace(dto.Referral) ? null : dto.Referral.Trim(),
            requestNote = string.IsNullOrWhiteSpace(dto.RequestNote) ? null : dto.RequestNote.Trim()
        };

        var pricingSnapshot = new
        {
            selectedService = new { service.ServiceId, service.ServiceName, amount = basePrice },
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
        var created = await userServices.GetByIdAsync(id);
        if (created is not null) return created;

        userService.Id = id;
        return userService;
    }
}
