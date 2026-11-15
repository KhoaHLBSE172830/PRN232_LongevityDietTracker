using DietFasting.Application.DTOs;

namespace DietFasting.Application.Services;

public interface IMealService
{
    Task<MealLogResponseDto> LogMealAsync(CreateMealLogDto dto);
    Task<List<MealLogResponseDto>> GetUserMealsAsync(Guid userId, DateTime date);
}

public interface IFastingService
{
    /// <param name="notificationEmail">E-mail taken from the caller's JWT; used for fasting reminders.</param>
    Task<FastingSessionResponseDto> StartFastingAsync(StartFastingRequestDto dto, string? notificationEmail = null, CancellationToken cancellationToken = default);
    Task<FastingSessionResponseDto> EndFastingAsync(Guid sessionId, Guid requesterUserId, string? moodNotes = null, CancellationToken cancellationToken = default);
    Task<FastingSessionResponseDto> CancelFastingAsync(Guid sessionId, Guid requesterUserId, string? reason = null, CancellationToken cancellationToken = default);
    Task<FastingSessionResponseDto?> GetActiveFastingSessionAsync(Guid userId, CancellationToken cancellationToken = default);
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

public interface IFmdRuleService
{
    Task<List<FmdRuleDto>> GetAllRulesAsync();
    Task<FmdRuleDto> UpdateRuleAsync(int dayNumber, UpdateFmdRuleRequest request);
}

public interface IMealTemplateService
{
    Task<List<MealTemplateDto>> GetAllTemplatesAsync();
    Task<MealTemplateDto> CreateTemplateAsync(CreateMealTemplateRequest request);
    Task<MealTemplateDto> GetTemplateByIdAsync(Guid id);
}
