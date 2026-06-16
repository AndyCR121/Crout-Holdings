using System.ComponentModel.DataAnnotations;

namespace CroutApi.DTOs.Company;

public record UpsertCompanyRequest(
    [Required] string CompanyName,
    string? Industry,
    string? VATNumber,
    string? RegistrationNumber,
    string? Email,
    string? Phone,
    string? Address
);
