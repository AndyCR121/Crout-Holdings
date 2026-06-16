namespace CroutApi.DTOs;

public record CreateAddonDto(
    int ServiceId,
    string AddonName,
    string? AddonDescription,
    decimal Price
);

public record UpdateAddonDto(
    int ServiceId,
    string AddonName,
    string? AddonDescription,
    decimal Price
);
