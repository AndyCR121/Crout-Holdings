using System.Text.Json;

namespace CroutApi.DTOs;

public class CustomFormConfigDto
{
    public int IntegrationId { get; set; }
    public int UserServiceId { get; set; }
    public int CompanyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string WebhookUrl { get; set; } = string.Empty;
    public string? DraftSchemaJson { get; set; }
    public string? PublishedSchemaJson { get; set; }
    public int Version { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public int? PublishedByUserId { get; set; }
    public bool HasPublishedSchema => !string.IsNullOrWhiteSpace(PublishedSchemaJson);
}

public class CustomFormAccessContextDto
{
    public int IntegrationId { get; set; }
    public int UserServiceId { get; set; }
    public int CompanyId { get; set; }
    public int CompanyOwnerUserId { get; set; }
    public int? AssignedDeveloperUserId { get; set; }
    public bool UserServiceActive { get; set; }
    public string? Title { get; set; }
    public string? WebhookUrl { get; set; }
    public string? DraftSchemaJson { get; set; }
    public string? PublishedSchemaJson { get; set; }
    public int Version { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public int? PublishedByUserId { get; set; }
}

public class SaveCustomFormDraftDto
{
    public string? Title { get; set; }
    public string? WebhookUrl { get; set; }
    public JsonElement Schema { get; set; }
}

public class CustomFormFileUploadResultDto
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string StorageReference { get; set; } = string.Empty;
}

public class SubmitCustomFormDto
{
    public Dictionary<string, JsonElement> Data { get; set; } = [];
}

public class CustomFormSubmissionResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}
