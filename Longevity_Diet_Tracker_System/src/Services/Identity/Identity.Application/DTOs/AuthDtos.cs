using Identity.Domain.Enums;

namespace Identity.Application.DTOs;

// Role KHÔNG nhận từ client: đăng ký tự do luôn là User. Admin đổi role qua PUT /api/users/{id}/role.
public record RegisterRequestDto(
    string Email,
    string Password,
    string FullName);

public record UpdateRoleRequestDto(string Role);

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
    string? HealthGoals,
    int? DailyCalorieTarget = null,
    int? ProteinPercent = null,
    int? CarbsPercent = null,
    int? FatPercent = null,
    string? PreferredFastingType = null,
    bool? WaterReminderEnabled = null,
    bool? EveningReminderEnabled = null);

