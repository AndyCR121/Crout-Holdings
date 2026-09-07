using CroutApi.DTOs;
using CroutApi.DTOs.ServiceTriggers;

namespace CroutApi.Services;

public interface IPublicFormAccessService
{
    /// <summary>Null covers every invalid case uniformly: never existed, expired, revoked, or never published (R8/R9).</summary>
    Task<PublicCustomFormDto?> ResolveAsync(string rawToken);

    /// <summary>Same uniform-null contract as ResolveAsync.</summary>
    Task<ExecuteTriggerResponseDto?> SubmitAsync(string rawToken, string? payloadJson);
}
