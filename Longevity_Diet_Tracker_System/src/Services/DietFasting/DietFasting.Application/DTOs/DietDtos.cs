using System.ComponentModel.DataAnnotations;
using DietFasting.Domain.Enums;

namespace DietFasting.Application.DTOs;

// Food & Meal DTOs (Blue Zones Plant Slant + 80% Hara Hachi Bu Rule)
public record CreateFoodItemDto(
    string ExternalFoodId,
    string FoodName,
    double ServingSize,
    string ServingUnit,
    double Calories,
    double ProteinGrams,
    double CarbsGrams,
    double FatGrams,
    double FiberGrams = 0);

public record FoodItemDto(
    string ExternalFoodId,
    string FoodName,
    double ServingSize,
    string ServingUnit,
    double Calories,
    double ProteinGrams,
    double CarbsGrams,
    double FatGrams,
    double FiberGrams = 0);

public record CreateMealLogDto(
    Guid UserId,
    MealType MealType,
    DateTime LoggedAt,
    List<CreateFoodItemDto> FoodItems,
    string? Notes = null,
    bool IsHaraHachiBuCompliant = true,
    int SatietyPercentage = 80,
    int UtcOffsetMinutes = 0);

public record UpdateMealLogDto(
    MealType MealType,
    List<CreateFoodItemDto> FoodItems,
    DateTime? LoggedAt = null,
    string? Notes = null,
    bool IsHaraHachiBuCompliant = true,
    int SatietyPercentage = 80,
    int UtcOffsetMinutes = 0);

public record MealLogResponseDto(
    Guid Id,
    Guid UserId,
    MealType MealType,
    DateTime LoggedAt,
    double TotalCalories,
    double TotalProteinGrams,
    double TotalCarbsGrams,
    double TotalFatGrams,
    double TotalFiberGrams,
    bool IsHaraHachiBuCompliant,
    int SatietyPercentage,
    bool ExceededThreshold,
    string? ThresholdViolationNotes,
    string? Notes,
    List<FoodItemDto> FoodItems);

// Fasting Session DTOs
// UserId in the body is ignored by the API: the owner is always taken from the JWT token (AGENT.md 4.3).
// StartTimeUtc is optional (default = now); it may be back-dated but not more than 5 minutes in the future.
public record StartFastingRequestDto(
    Guid UserId,
    FastingType FastingType,
    DateTime StartTimeUtc,
    [Range(0.5, 168, ErrorMessage = "DurationHours must be between 0.5 and 168.")] double DurationHours);

public record EndFastingRequestDto(
    [MaxLength(500)] string? MoodNotes = null);

public record CancelFastingRequestDto(
    [MaxLength(500)] string? Reason = null);

public record FastingSessionResponseDto(
    Guid Id,
    Guid UserId,
    FastingType FastingType,
    DateTime StartTimeUtc,
    DateTime TargetEndTimeUtc,
    DateTime? ActualEndTimeUtc,
    FastingStatus Status,
    double? ActualFastedHours,
    string? MoodNotes = null,
    bool IsPaused = false,
    DateTime? PausedAtUtc = null);

/// <summary>Thống kê chuỗi ngày nhịn ăn của một người dùng (tính theo ngày UTC của phiên Completed).</summary>
public record FastingStatsDto(
    int CurrentStreakDays,
    int LongestStreakDays,
    int CompletedSessions,
    double TotalFastedHours);

// FMD Cycle DTOs
public record StartFmdCycleDto(
    Guid UserId,
    DateTime StartDate);

public record FmdCycleResponseDto(
    Guid Id,
    Guid UserId,
    int CycleNumber,
    DateTime StartDate,
    DateTime EndDate,
    int CurrentDay,
    FmdStatus Status,
    double TargetCaloriesToday);

// Admin Master Data DTOs (C0 System Context & AGENT.md)
public record FmdRuleDto(
    Guid Id,
    int DayNumber,
    double MaxCalories,
    double TargetProteinPercent,
    double TargetFatPercent,
    double TargetCarbPercent,
    string Description);

public record UpdateFmdRuleRequest(
    double MaxCalories,
    double TargetProteinPercent,
    double TargetFatPercent,
    double TargetCarbPercent,
    string Description);

public record MealTemplateDto(
    Guid Id,
    string Name,
    string Description,
    FastingType AssociatedFastingType,
    int? FmdDayNumber,
    double TotalCalories,
    double TotalProteinGrams,
    double TotalCarbsGrams,
    double TotalFatGrams,
    double TotalFiberGrams,
    bool IsPlantSlantCompliant,
    bool IsHaraHachiBuOptimized,
    bool IsAdminTemplate,
    string? RecipeContentJson);

public record CreateMealTemplateRequest(
    string Name,
    string Description,
    FastingType AssociatedFastingType,
    int? FmdDayNumber,
    double TotalCalories,
    double TotalProteinGrams,
    double TotalCarbsGrams,
    double TotalFatGrams,
    double TotalFiberGrams,
    bool IsPlantSlantCompliant = true,
    bool IsHaraHachiBuOptimized = true,
    string? RecipeContentJson = null);


public record HabitDayDto(
    DateOnly Date,
    int WaterMl,
    int MovementMinutes,
    int WaterGoalMl,
    int MovementGoalMinutes);

/// <summary>Đặt giá trị tuyệt đối trong ngày; trường null giữ nguyên.</summary>
public record SetHabitDto(int? WaterMl = null, int? MovementMinutes = null);

/// <summary>Cộng thêm (số âm để hoàn tác).</summary>
public record AddHabitDto(int WaterMl = 0, int MovementMinutes = 0);


/// <summary>Áp dụng mẫu bữa ăn thành một bữa ăn thật của người dùng.</summary>
public record ApplyMealTemplateDto(
    MealType MealType,
    DateTime? LoggedAt = null,
    int UtcOffsetMinutes = 0,
    int SatietyPercentage = 80);
