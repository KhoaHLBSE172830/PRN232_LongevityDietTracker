using BuildingBlocks.Common.Repositories;
using DietFasting.Domain.Entities;

namespace DietFasting.Application.Repositories;

public interface IMealLogRepository : IGenericRepository<MealLog>
{
    Task<List<MealLog>> GetUserMealsByDateAsync(Guid userId, DateTime date);
    Task<double> GetUserTotalCaloriesForDateAsync(Guid userId, DateTime date);
}

public interface IFastingSessionRepository : IGenericRepository<FastingSession>
{
    Task<FastingSession?> GetActiveSessionAsync(Guid userId);
    Task<List<FastingSession>> GetCompletedSessionsAsync(Guid userId);
}

public interface IFmdCycleRepository : IGenericRepository<FmdCycle>
{
    Task<FmdCycle?> GetActiveCycleAsync(Guid userId);
    Task<int> GetCycleCountAsync(Guid userId);
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
