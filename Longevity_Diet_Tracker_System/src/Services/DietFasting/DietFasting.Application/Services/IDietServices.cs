using DietFasting.Application.DTOs;

namespace DietFasting.Application.Services;

public interface IMealService
{
    Task<MealLogResponseDto> LogMealAsync(CreateMealLogDto dto);
    /// <param name="utcOffsetMinutes">Chênh lệch múi giờ của người dùng so với UTC (vd. Việt Nam = 420) để "ngày" tính theo giờ địa phương.</param>
    Task<List<MealLogResponseDto>> GetUserMealsAsync(Guid userId, DateTime date, int utcOffsetMinutes = 0);
    Task<MealLogResponseDto> LogMealFromTemplateAsync(Guid userId, MealTemplateDto template, ApplyMealTemplateDto dto);
    Task<MealLogResponseDto> UpdateMealAsync(Guid mealId, Guid requesterUserId, bool isAdmin, UpdateMealLogDto dto, string? notificationEmail = null);
    Task DeleteMealAsync(Guid mealId, Guid requesterUserId, bool isAdmin);
}

public interface IFastingService
{
    /// <param name="notificationEmail">E-mail taken from the caller's JWT; used for fasting reminders.</param>
    Task<FastingSessionResponseDto> StartFastingAsync(StartFastingRequestDto dto, string? notificationEmail = null, CancellationToken cancellationToken = default);
    Task<FastingSessionResponseDto> EndFastingAsync(Guid sessionId, Guid requesterUserId, string? moodNotes = null, CancellationToken cancellationToken = default);
    Task<FastingSessionResponseDto> CancelFastingAsync(Guid sessionId, Guid requesterUserId, string? reason = null, CancellationToken cancellationToken = default);
    Task<FastingSessionResponseDto?> GetActiveFastingSessionAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<FastingSessionResponseDto> PauseFastingAsync(Guid sessionId, Guid requesterUserId, CancellationToken cancellationToken = default);
    Task<FastingSessionResponseDto> ResumeFastingAsync(Guid sessionId, Guid requesterUserId, CancellationToken cancellationToken = default);
    Task<List<FastingSessionResponseDto>> GetHistoryAsync(Guid userId, int limit = 30, CancellationToken cancellationToken = default);
    Task<FastingStatsDto> GetStatsAsync(Guid userId, CancellationToken cancellationToken = default);
}

public interface IFmdService
{
    Task<FmdCycleResponseDto> StartCycleAsync(StartFmdCycleDto dto);
    Task<FmdCycleResponseDto?> GetActiveCycleAsync(Guid userId);
    Task<List<FmdCycleResponseDto>> GetHistoryAsync(Guid userId);
    Task<FmdCycleResponseDto> CancelCycleAsync(Guid cycleId, Guid requesterUserId, bool isAdmin);
    Task<int> AdvanceActiveCyclesAsync(CancellationToken cancellationToken = default);
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


public interface IHabitService
{
    Task<HabitDayDto> GetDayAsync(Guid userId, DateOnly date);
    Task<HabitDayDto> SetDayAsync(Guid userId, DateOnly date, SetHabitDto dto);
    Task<HabitDayDto> AddToDayAsync(Guid userId, DateOnly date, AddHabitDto dto);
    Task<List<HabitDayDto>> GetRangeAsync(Guid userId, DateOnly from, DateOnly to);
    Task<HabitStreakDto> GetStreakAsync(Guid userId, DateOnly today);
}
