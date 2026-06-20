using CroutApi.DTOs.Auth;
using CroutApi.Helpers;
using CroutApi.Models;
using CroutApi.Repositories;

namespace CroutApi.Services;

public class AuthService(IUserRepository users, JwtHelper jwt, EncryptionHelper enc) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await users.GetByUsernameAsync(request.Identifier);
        if (user is null) return null;
        if (user.PasswordHash != enc.Hash(request.Password)) return null;
        return BuildResponse(user);
    }

    public async Task<LoginResponse> RegisterAsync(RegisterRequest request)
    {
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

    private LoginResponse BuildResponse(User user)
    {
        var token = jwt.GenerateToken(user.UserId, user.Username, user.IsAdmin, user.IsDev);
        var dto   = new UserDto(user.UserId, user.Username, user.FirstName, user.Surname, user.Email, user.CellNumber, user.IsAdmin, user.IsDev, user.Referral);
        return new LoginResponse(token, dto);
    }
}
