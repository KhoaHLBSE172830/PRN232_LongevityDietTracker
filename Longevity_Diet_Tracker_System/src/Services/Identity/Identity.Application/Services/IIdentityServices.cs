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
    Task SetRoleAsync(Guid userId, Identity.Domain.Enums.UserRole role);
    Task<PagedResultDto<UserSummaryDto>> GetUsersPagedAsync(UserQueryParameters query);
    Task<UserStatusResponseDto> SetUserStatusAsync(Guid currentAdminId, Guid targetUserId, SetUserStatusRequestDto request);
    Task<AdminDashboardStatsDto> GetAdminStatsAsync();
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

