using Identity.Domain.Enums;

namespace Identity.Application.DTOs;

public record RegisterRequestDto(
    string Email,
    string Password,
    string FullName,
    UserRole Role = UserRole.User);

public record LoginRequestDto(
    string Email,
    string Password);

public record GoogleLoginRequestDto(
    string IdToken);

public record RefreshTokenRequestDto(
    string Token,
    string RefreshToken);

public record AuthResponseDto(
    Guid UserId,
    string Email,
    string FullName,
    string Role,
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAtUtc);

public record UserProfileDto(
    Guid UserId,
    DateTime? DateOfBirth,
    string? Gender,
    double? HeightCm,
    double? CurrentWeightKg,
    double? TargetWeightKg,
    string? DietaryPreference,
    string? HealthGoals);

