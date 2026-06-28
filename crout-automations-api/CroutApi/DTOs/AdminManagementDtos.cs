namespace CroutApi.DTOs;

public class AdminClientServiceRowDto
{
    public int UserServiceId { get; set; }
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public int UserId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string ClientEmail { get; set; } = string.Empty;
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public int? PackageId { get; set; }
    public string? PackageName { get; set; }
    public string? SubscriptionId { get; set; }
    public string? Config { get; set; }
    public bool Active { get; set; }
    public int Status { get; set; }
    public decimal SubscriptionAmount { get; set; }
    public string? PricingSnapshot { get; set; }
    public DateTime? PaymentDate { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? IntegrationStatus { get; set; }
    public string? IntegrationWorkflowName { get; set; }
    public string? IntegrationLastError { get; set; }
    public DateTime? IntegrationPublishedDate { get; set; }
    public DateTime? IntegrationPausedDate { get; set; }
}

public record AdminUpsertClientServiceDto(
    int CompanyId,
    int ServiceId,
    int? PackageId,
    string? Config,
    bool Active,
    int Status,
    decimal SubscriptionAmount,
    string? SubscriptionId,
    DateTime? PaymentDate,
    DateTime? DueDate);

public record AdminUpdateClientServiceConfigDto(
    int? PackageId,
    string? Config,
    bool Active,
    int Status,
    decimal SubscriptionAmount,
    string? SubscriptionId,
    DateTime? PaymentDate,
    DateTime? DueDate);

public class AdminPaystackMappingRowDto
{
    public int UserServiceId { get; set; }
    public int CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public int UserId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string ClientEmail { get; set; } = string.Empty;
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public int? PackageId { get; set; }
    public string? PackageName { get; set; }
    public string? SubscriptionId { get; set; }
    public decimal SubscriptionAmount { get; set; }
    public int Status { get; set; }
    public bool Active { get; set; }
    public string MappingStatus { get; set; } = string.Empty;
    public DateTime? PaymentDate { get; set; }
    public DateTime? DueDate { get; set; }
}

public record AdminMapPaystackSubscriptionDto(
    string? SubscriptionId,
    int Status,
    DateTime? PaymentDate,
    DateTime? DueDate);
