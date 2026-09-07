namespace CroutApi.Helpers;

/// <summary>Named rate-limit policy constants for the public share-link endpoints (design.md D4).</summary>
public static class RateLimiting
{
    public const string PublicFormsReadPolicy = "public-forms-read";
    public const string PublicFormsSubmitPolicy = "public-forms-submit";
}
