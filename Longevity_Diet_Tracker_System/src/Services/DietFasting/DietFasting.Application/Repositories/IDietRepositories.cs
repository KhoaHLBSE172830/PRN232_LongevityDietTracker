using BuildingBlocks.Common.Repositories;
using DietFasting.Domain.Entities;

namespace DietFasting.Application.Repositories;

public interface IMealLogRepository : IGenericRepository<MealLog>
{
    Task<List<MealLog>> GetUserMealsByDateAsync(Guid userId, DateTime date);
    Task<double> GetUserTotalCaloriesForDateAsync(Guid userId, DateTime date);
    Task<MealLog?> GetWithItemsAsync(Guid mealLogId);
    Task<List<MealLog>> GetUserMealsInRangeAsync(Guid userId, DateTime startUtc, DateTime endUtc);
}

public interface IFastingSessionRepository : IGenericRepository<FastingSession>
{
    Task<FastingSession?> GetActiveSessionAsync(Guid userId);
    Task<List<FastingSession>> GetCompletedSessionsAsync(Guid userId);
    Task<List<FastingSession>> GetHistoryAsync(Guid userId, int limit);
}

public interface IFmdCycleRepository : IGenericRepository<FmdCycle>
{
    Task<FmdCycle?> GetActiveCycleAsync(Guid userId);
    Task<int> GetCycleCountAsync(Guid userId);
    Task<List<FmdCycle>> GetAllActiveCyclesAsync();
}

public interface IFmdRuleRepository : IGenericRepository<FmdRule>
{
    Task<FmdRule?> GetRuleByDayAsync(int dayNumber);
    Task<List<FmdRule>> GetAllRulesAsync();
}

public interface IMealTemplateRepository : IGenericRepository<MealTemplate>
{
    Task<List<MealTemplate>> GetTemplatesAsync(bool adminOnly = false);
}


public interface IHabitLogRepository : IGenericRepository<HabitLog>
{
    Task<HabitLog?> GetByUserAndDateAsync(Guid userId, DateOnly date);
    Task<List<HabitLog>> GetRangeAsync(Guid userId, DateOnly from, DateOnly to);
}
