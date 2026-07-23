namespace CroutApi.DTOs.Services;

public record CreateUserServiceFromConfigDto(
    int CompanyId,
    int ServiceId,
    int? PackageId,
    int[]? AddonIds,
    string? Referral,
    string? RequestNote
);

public record RequestServiceConfigChangeDto(
    int[]? AddonIds,
    string[]? Trigger,
    string[]? Action,
    string[]? Output,
    string? TriggerNotes,
    string? ActionNotes,
    string? OutputNotes
);

public record UpdateServiceCredentialsDto(
    string IntegrationName,
    Dictionary<string, string>? Fields,
    string[]? RemoveFields = null
);
