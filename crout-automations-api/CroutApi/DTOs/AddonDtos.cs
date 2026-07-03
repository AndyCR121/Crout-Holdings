namespace CroutApi.DTOs;

public record CreateAddonDto(
    string AddonName,
    string? AddonDescription,
    string Type,
    decimal MonthlyPrice,
    bool IsActive,
    int DisplayOrder,
    List<int>? ServiceIds,
    List<int>? IntegrationIds
);

public record UpdateAddonDto(
    string AddonName,
    string? AddonDescription,
    string Type,
    decimal MonthlyPrice,
    bool IsActive,
    int DisplayOrder,
    List<int>? ServiceIds,
    List<int>? IntegrationIds
);
