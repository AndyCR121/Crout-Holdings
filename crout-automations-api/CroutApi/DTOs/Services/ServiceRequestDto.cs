namespace CroutApi.DTOs.Services;

public record SubmitServiceRequestDto(
    int CompanyId,
    int ServiceId,
    int? PackageId,
    string? RequestNote,
    string[]? SelectedAddons,
    string? Referral
);
