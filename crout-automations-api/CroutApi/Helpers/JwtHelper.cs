using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace CroutApi.Helpers;

/// <summary>Creates and validates JWT bearer tokens.</summary>
public sealed class JwtHelper
{
    private readonly SymmetricSecurityKey _key;
    private readonly string              _issuer;
    private readonly string              _audience;
    private readonly int                 _expiryHours;

    public JwtHelper(string secret, string issuer, string audience, int expiryHours = 8)
    {
        _key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        _issuer      = issuer;
        _audience    = audience;
        _expiryHours = expiryHours;
    }

    /// <summary>Generates a signed JWT for the given user.</summary>
    public string GenerateToken(int userId, string username, bool isAdmin)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,        userId.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, username),
            new Claim("is_admin",                         isAdmin.ToString().ToLowerInvariant()),
            new Claim(JwtRegisteredClaimNames.Jti,        Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:             _issuer,
            audience:           _audience,
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            DateTime.UtcNow.AddHours(_expiryHours),
            signingCredentials: new SigningCredentials(_key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Extracts user_id from the JWT sub claim on an authenticated principal.
    /// ASP.NET's JWT middleware remaps "sub" to ClaimTypes.NameIdentifier, so we
    /// check both to be safe.
    /// </summary>
    public static int GetUserId(ClaimsPrincipal principal)
    {
        // ASP.NET remaps "sub" → ClaimTypes.NameIdentifier at middleware level
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                 ?? throw new InvalidOperationException("sub claim missing");

        return int.Parse(value);
    }
}
