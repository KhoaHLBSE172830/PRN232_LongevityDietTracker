using Identity.Application.DTOs;

namespace Identity.Application.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request);
    Task<AuthResponseDto> LoginAsync(LoginRequestDto request);
    Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginRequestDto request);
    Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequestDto request);
}

public interface IUserService
{
    Task<UserProfileDto> GetProfileAsync(Guid userId);
    Task<UserProfileDto> UpdateProfileAsync(Guid userId, UserProfileDto profileDto);
}

public interface IJwtService
{
    string GenerateAccessToken(Identity.Domain.Entities.User user);
    Identity.Domain.Entities.RefreshToken GenerateRefreshToken(Guid userId);
}

public interface IGoogleAuthService
{
    Task<(string Email, string FullName, string GoogleId)> VerifyGoogleTokenAsync(string idToken);
}

