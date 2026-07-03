namespace CroutApi.DTOs;

public record LinkServicesToPackageDto(List<int> ServiceIds);
public record LinkServicesToAddonDto(List<int> ServiceIds);
public record LinkIntegrationsToAddonDto(List<int> IntegrationIds);
