namespace CroutApi.DTOs.Services;

public record DeveloperReferralOptionDto(
    int UserId,
    string FirstName,
    string Surname,
    string Referral
);
