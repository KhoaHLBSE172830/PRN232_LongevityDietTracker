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
    int SatietyPercentage = 80);

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
public record StartFastingRequestDto(
    Guid UserId,
    FastingType FastingType,
    DateTime StartTimeUtc,
    double DurationHours);

public record FastingSessionResponseDto(
    Guid Id,
    Guid UserId,
    FastingType FastingType,
    DateTime StartTimeUtc,
    DateTime TargetEndTimeUtc,
    DateTime? ActualEndTimeUtc,
    FastingStatus Status,
    double? ActualFastedHours,
    string? MoodNotes = null);

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
