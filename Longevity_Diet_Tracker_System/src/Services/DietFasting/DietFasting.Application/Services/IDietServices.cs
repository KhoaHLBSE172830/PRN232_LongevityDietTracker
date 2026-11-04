using DietFasting.Application.DTOs;

namespace DietFasting.Application.Services;

public interface IMealService
{
    Task<MealLogResponseDto> LogMealAsync(CreateMealLogDto dto);
    Task<List<MealLogResponseDto>> GetUserMealsAsync(Guid userId, DateTime date);
}

public interface IFastingService
{
    Task<FastingSessionResponseDto> StartFastingAsync(StartFastingRequestDto dto);
    Task<FastingSessionResponseDto> EndFastingAsync(Guid sessionId);
    Task<FastingSessionResponseDto?> GetActiveFastingSessionAsync(Guid userId);
}

public interface IFmdService
{
    Task<FmdCycleResponseDto> StartCycleAsync(StartFmdCycleDto dto);
    Task<FmdCycleResponseDto?> GetActiveCycleAsync(Guid userId);
}

public interface INutritionService
{
    Task<List<FoodItemDto>> SearchFoodItemsAsync(string query);
    Task<FoodItemDto> GetFoodDetailsAsync(string externalFoodId);
}

public interface IRedisCacheService
{
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null);
    Task RemoveAsync(string key);
}

