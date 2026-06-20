namespace CroutApi.DTOs;

public record SubmitContactRequestDto(
    string Name,
    string Email,
    string? Phone,
    string? Business,
    string Service,
    string Message,
    string? Referral,
    ContactConfigDto? Config,
    string? Source,
    string? Timestamp
);

public record ContactConfigDto(
    int? ServiceId,
    string? ServiceName,
    int? PackageId,
    string? PackageName,
    decimal? BasePrice,
    decimal? FullTotal,
    decimal? DiscountedTotal,
    decimal? Discount,
    IReadOnlyCollection<ContactConfigAddonDto>? Addons,
    IReadOnlyCollection<ContactConfigServiceDto>? Services
);

public record ContactConfigAddonDto(
    int AddonId,
    string AddonName,
    decimal Price
);

public record ContactConfigServiceDto(
    int ServiceId,
    string ServiceName,
    decimal Price
);

public record ContactRequestResponseDto(int RequestId, bool EmailSent, string Message);
