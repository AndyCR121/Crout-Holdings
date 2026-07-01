using System.Security.Cryptography;
using System.Text;

namespace CroutApi.Helpers;

public sealed class SensitiveDataProtector
{
    private readonly byte[] _key;

    public SensitiveDataProtector(string secret)
    {
        if (string.IsNullOrWhiteSpace(secret))
            throw new ArgumentException("Protection secret must not be empty.", nameof(secret));

        _key = SHA256.HashData(Encoding.UTF8.GetBytes(secret));
    }

    public string Protect(string plainText)
    {
        ArgumentNullException.ThrowIfNull(plainText);

        var nonce = RandomNumberGenerator.GetBytes(12);
        var plaintextBytes = Encoding.UTF8.GetBytes(plainText);
        var cipher = new byte[plaintextBytes.Length];
        var tag = new byte[16];

        using var aes = new AesGcm(_key, 16);
        aes.Encrypt(nonce, plaintextBytes, cipher, tag);

        return Convert.ToBase64String(nonce.Concat(tag).Concat(cipher).ToArray());
    }

    public string Unprotect(string protectedValue)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(protectedValue);

        var bytes = Convert.FromBase64String(protectedValue);
        if (bytes.Length < 28)
            throw new ArgumentException("Protected value is invalid.", nameof(protectedValue));

        var nonce = bytes[..12];
        var tag = bytes[12..28];
        var cipher = bytes[28..];
        var plaintext = new byte[cipher.Length];

        using var aes = new AesGcm(_key, 16);
        aes.Decrypt(nonce, cipher, tag, plaintext);
        return Encoding.UTF8.GetString(plaintext);
    }
}
