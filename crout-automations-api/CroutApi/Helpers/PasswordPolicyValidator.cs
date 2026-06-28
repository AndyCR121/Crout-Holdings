using System.Text.RegularExpressions;

namespace CroutApi.Helpers;

public static partial class PasswordPolicyValidator
{
    public static void ValidateOrThrow(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Password is required.");
        if (password.Length < 7)
            throw new ArgumentException("Password must be at least 7 characters.");
        if (!UppercasePattern().IsMatch(password))
            throw new ArgumentException("Password must include at least one uppercase letter.");
        if (!DigitPattern().IsMatch(password))
            throw new ArgumentException("Password must include at least one number.");
        if (!SpecialCharacterPattern().IsMatch(password))
            throw new ArgumentException("Password must include at least one special character.");
    }

    [GeneratedRegex("[A-Z]")]
    private static partial Regex UppercasePattern();

    [GeneratedRegex(@"\d")]
    private static partial Regex DigitPattern();

    [GeneratedRegex(@"[^A-Za-z0-9]")]
    private static partial Regex SpecialCharacterPattern();
}
