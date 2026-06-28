using CroutApi.DTOs.Auth;
using CroutApi.Helpers;
using CroutApi.Models;
using CroutApi.Repositories;
using System.Security.Cryptography;

namespace CroutApi.Services;

public class AuthService(
    IUserRepository users,
    IPasswordResetRepository passwordResets,
    IEmailService email,
    JwtHelper jwt,
    EncryptionHelper enc) : IAuthService
{
    private const int PasswordResetOtpExpiryMinutes = 10;
    private const int MaxOtpAttempts = 3;

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await users.GetByUsernameAsync(request.Identifier);
        if (user is null) return null;
        if (!enc.Verify(request.Password, user.PasswordHash)) return null;
        return BuildResponse(user);
    }

    public async Task<LoginResponse> RegisterAsync(RegisterRequest request)
    {
        PasswordPolicyValidator.ValidateOrThrow(request.Password);

        if (await users.UsernameExistsAsync(request.Username))
            throw new InvalidOperationException("Username already taken.");
        if (await users.EmailExistsAsync(request.Email))
            throw new InvalidOperationException("Email already registered.");

        var user = new User
        {
            Username     = request.Username,
            PasswordHash = enc.Hash(request.Password),
            FirstName    = request.FirstName,
            Surname      = request.Surname,
            Email        = request.Email,
            CellNumber   = request.CellNumber,
        };
        user.UserId = await users.CreateAsync(user);
        return BuildResponse(user);
    }

    public async Task<PasswordResetSessionResponse> RequestPasswordResetAsync(PasswordResetRequest request)
    {
        var user = await users.GetByEmailAsync(request.Email.Trim())
            ?? throw new KeyNotFoundException("No account exists for this email.");

        return await CreateAndSendPasswordResetOtpAsync(user, Guid.NewGuid().ToString());
    }

    public async Task<PasswordResetSessionResponse> ResendPasswordResetAsync(PasswordResetResendRequest request)
    {
        var reset = await passwordResets.GetLatestByRequestIdAsync(request.ResetRequestId.Trim())
            ?? throw new KeyNotFoundException("Password reset request not found.");
        var user = await users.GetByIdAsync(reset.UserId)
            ?? throw new KeyNotFoundException("Password reset request not found.");

        return await CreateAndSendPasswordResetOtpAsync(user, reset.ResetRequestId);
    }

    public async Task VerifyPasswordResetOtpAsync(PasswordResetVerifyRequest request)
    {
        var reset = await passwordResets.GetLatestByRequestIdAsync(request.ResetRequestId.Trim())
            ?? throw new KeyNotFoundException("Password reset request not found.");

        await EnsureResetIsUsableAsync(reset);
        if (reset.VerifiedAt is not null)
            return;

        if (!enc.Verify(request.Otp, reset.OtpHash))
        {
            await passwordResets.IncrementAttemptCountAsync(reset.PasswordResetOtpId);
            var attempts = reset.AttemptCount + 1;
            if (attempts >= MaxOtpAttempts)
            {
                await passwordResets.MarkInvalidatedAsync(reset.PasswordResetOtpId);
                throw new ArgumentException("OTP is no longer valid. Please resend a new code.");
            }

            throw new ArgumentException("Invalid OTP.");
        }

        await passwordResets.MarkVerifiedAsync(reset.PasswordResetOtpId);
    }

    public async Task CompletePasswordResetAsync(PasswordResetCompleteRequest request)
    {
        if (!string.Equals(request.NewPassword, request.ConfirmPassword, StringComparison.Ordinal))
            throw new ArgumentException("Passwords do not match.");

        PasswordPolicyValidator.ValidateOrThrow(request.NewPassword);

        var reset = await passwordResets.GetLatestByRequestIdAsync(request.ResetRequestId.Trim())
            ?? throw new KeyNotFoundException("Password reset request not found.");

        await EnsureResetIsUsableAsync(reset, requireVerified: true);

        await users.UpdatePasswordAsync(reset.UserId, enc.Hash(request.NewPassword));
        await users.IncrementTokenVersionAsync(reset.UserId);
        await passwordResets.MarkConsumedByRequestIdAsync(reset.ResetRequestId);
    }

    private LoginResponse BuildResponse(User user)
    {
        var token = jwt.GenerateToken(user.UserId, user.Username, user.IsAdmin, user.IsDev, user.TokenVersion);
        var dto   = new UserDto(user.UserId, user.Username, user.FirstName, user.Surname, user.Email, user.CellNumber, user.IsAdmin, user.IsDev, user.Referral);
        return new LoginResponse(token, dto);
    }

    private async Task<PasswordResetSessionResponse> CreateAndSendPasswordResetOtpAsync(User user, string resetRequestId)
    {
        await passwordResets.InvalidateActiveByUserAsync(user.UserId);

        var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        await passwordResets.CreateAsync(new PasswordResetOtp
        {
            ResetRequestId = resetRequestId,
            UserId = user.UserId,
            OtpHash = enc.Hash(otp),
            AttemptCount = 0,
            ExpiresAt = DateTime.UtcNow.AddMinutes(PasswordResetOtpExpiryMinutes),
        });

        var sent = await email.SendPasswordResetOtpAsync(user.Email, user.FirstName, otp);
        if (!sent)
        {
            var reset = await passwordResets.GetLatestByRequestIdAsync(resetRequestId);
            if (reset is not null)
                await passwordResets.MarkInvalidatedAsync(reset.PasswordResetOtpId);

            throw new InvalidOperationException("Could not send a reset code. Please try again.");
        }

        return new PasswordResetSessionResponse(resetRequestId);
    }

    private async Task EnsureResetIsUsableAsync(PasswordResetOtp reset, bool requireVerified = false)
    {
        if (reset.ConsumedAt is not null || reset.InvalidatedAt is not null)
            throw new ArgumentException("OTP is no longer valid. Please resend a new code.");
        if (reset.ExpiresAt <= DateTime.UtcNow)
        {
            await passwordResets.MarkInvalidatedAsync(reset.PasswordResetOtpId);
            throw new ArgumentException("OTP has expired. Please resend a new code.");
        }
        if (requireVerified && reset.VerifiedAt is null)
            throw new ArgumentException("OTP verification is required before resetting your password.");
    }
}
