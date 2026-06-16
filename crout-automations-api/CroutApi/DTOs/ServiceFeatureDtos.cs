namespace CroutApi.DTOs;

public record CreateServiceFeatureDto(
    int ServiceId,
    string Feature,
    int SortOrder = 0
);

public record UpdateServiceFeatureDto(
    int ServiceId,
    string Feature,
    int SortOrder = 0
);
