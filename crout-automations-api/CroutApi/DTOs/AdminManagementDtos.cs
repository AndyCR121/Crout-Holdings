namespace CroutApi.DTOs;

public record AdminClientServiceRowDto(
    int UserServiceId,
    int CompanyId,
    string CompanyName,
    int UserId,
    string ClientName,
    string ClientEmail,
    int ServiceId,
    string ServiceName,
    int? PackageId,
    string? PackageName,
    string? SubscriptionId,
    string? Config,
    bool Active,
    int Status,
    decimal SubscriptionAmount,
    string? PricingSnapshot,
    DateTime? PaymentDate,
    DateTime? DueDate,
    DateTime CreatedAt);

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

public record AdminPaystackMappingRowDto(
    int UserServiceId,
    int CompanyId,
    string CompanyName,
    int UserId,
    string ClientName,
    string ClientEmail,
    int ServiceId,
    string ServiceName,
    int? PackageId,
    string? PackageName,
    string? SubscriptionId,
    decimal SubscriptionAmount,
    int Status,
    bool Active,
    string MappingStatus,
    DateTime? PaymentDate,
    DateTime? DueDate);

public record AdminMapPaystackSubscriptionDto(
    string? SubscriptionId,
    int Status,
    DateTime? PaymentDate,
    DateTime? DueDate);
