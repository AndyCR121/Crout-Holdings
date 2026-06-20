namespace CroutApi.DTOs.Services;

public record CreateUserServiceFromConfigDto(
    int CompanyId,
    int ServiceId,
    int? PackageId,
    int[]? AddonIds,
    string? Referral,
    string? RequestNote
);
