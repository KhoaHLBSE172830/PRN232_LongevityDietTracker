using DietFasting.Domain.Enums;

namespace DietFasting.Application.DTOs;

public record FoodItemDto(
    string ExternalFoodId,
    string FoodName,
    double ServingSize,
    string ServingUnit,
    double Calories,
    double ProteinGrams,
    double CarbsGrams,
    double FatGrams);

public record CreateMealLogDto(
    Guid UserId,
    MealType MealType,
    DateTime LoggedAt,
    string? Notes,
    List<FoodItemDto> FoodItems);

public record MealLogResponseDto(
    Guid Id,
    Guid UserId,
    MealType MealType,
    DateTime LoggedAt,
    double TotalCalories,
    double TotalProteinGrams,
    double TotalCarbsGrams,
    double TotalFatGrams,
    string? Notes,
    List<FoodItemDto> FoodItems);

public record StartFastingRequestDto(
    Guid UserId,
    FastingType FastingType,
    DateTime StartTimeUtc,
    int DurationHours);

public record FastingSessionResponseDto(
    Guid Id,
    Guid UserId,
    FastingType FastingType,
    DateTime StartTimeUtc,
    DateTime TargetEndTimeUtc,
    DateTime? ActualEndTimeUtc,
    FastingStatus Status,
    double? ActualFastedHours);

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
    FmdStatus Status);

public record NutritionLookupDto(
    string Query,
    List<FoodItemDto> Results);

