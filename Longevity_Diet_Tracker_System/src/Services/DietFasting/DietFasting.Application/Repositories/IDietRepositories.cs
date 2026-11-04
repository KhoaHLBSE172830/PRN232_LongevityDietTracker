using BuildingBlocks.Common.Repositories;
using DietFasting.Domain.Entities;

namespace DietFasting.Application.Repositories;

public interface IMealLogRepository : IGenericRepository<MealLog>
{
    Task<List<MealLog>> GetUserMealsByDateAsync(Guid userId, DateTime date);
    Task<MealLog?> GetWithItemsAsync(Guid mealLogId);
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

