using System.Security.Cryptography;
using System.Text;

namespace CroutApi.Services;

/// <summary>
/// Opaque share-link token generation/hashing, shared by the owner-facing generate path
/// and the public resolve path so hashing can never drift between the two (design.md D1).
/// </summary>
public static class ShareLinkTokens
{
    public static string GenerateRawToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
        .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    public static string Hash(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken))).ToLowerInvariant();
}
