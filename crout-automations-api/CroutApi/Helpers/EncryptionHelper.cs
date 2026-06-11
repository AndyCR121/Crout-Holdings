using System.Security.Cryptography;
using System.Text;

namespace CroutApi.Helpers;

/// <summary>
/// One-way HMAC-SHA256 password hashing using the HMAC_SECRET env variable.
/// </summary>
public sealed class EncryptionHelper
{
    private readonly byte[] _key;

    public EncryptionHelper(string secret)
    {
        if (string.IsNullOrWhiteSpace(secret))
            throw new ArgumentException("HMAC secret must not be empty.", nameof(secret));
        _key = Encoding.UTF8.GetBytes(secret);
    }

    /// <summary>Returns lowercase hex HMAC-SHA256 digest of plainText.</summary>
    public string Hash(string plainText)
    {
        ArgumentNullException.ThrowIfNull(plainText);
        using var hmac = new HMACSHA256(_key);
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(plainText))).ToLowerInvariant();
    }

    /// <summary>Constant-time comparison to prevent timing attacks.</summary>
    public bool Verify(string plainText, string storedHash)
        => CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(Hash(plainText)),
            Encoding.UTF8.GetBytes(storedHash));
}
