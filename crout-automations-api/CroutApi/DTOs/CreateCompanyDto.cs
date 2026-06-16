namespace CroutApi.DTOs;

public class CreateCompanyDto
{
    public int    UserId             { get; set; }
    public string CompanyName        { get; set; } = string.Empty;
    public string? Industry           { get; set; }
    public string? VATNumber          { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? Email              { get; set; }
    public string? Phone              { get; set; }
    public string? Address            { get; set; }
    public bool    Active             { get; set; } = true;
}
