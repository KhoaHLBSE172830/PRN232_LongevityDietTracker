using BuildingBlocks.Grpc.Contracts;
using DietFasting.Application.Repositories;
using DietFasting.Domain.Enums;

namespace DietFasting.Infrastructure.Core.Grpc;

public class DietFastingGrpcServer : IDietFastingGrpcClientService
{
    private readonly IFastingSessionRepository _fastingRepository;
    private readonly IMealLogRepository _mealRepository;
    private readonly IFmdCycleRepository _fmdRepository;

    public DietFastingGrpcServer(
        IFastingSessionRepository fastingRepository,
        IMealLogRepository mealRepository,
        IFmdCycleRepository fmdRepository)
    {
        _fastingRepository = fastingRepository;
        _mealRepository = mealRepository;
        _fmdRepository = fmdRepository;
    }

    public async Task<FastingSummaryContract> GetUserFastingSummaryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var activeSession = await _fastingRepository.GetActiveSessionAsync(userId);
        var completedFasts = await _fastingRepository.GetCompletedSessionsAsync(userId);
        var totalHours = completedFasts.Sum(f => f.ActualFastedHours ?? 0);

        return new FastingSummaryContract
        {
            UserId = userId,
            IsCurrentlyFasting = activeSession != null,
            CurrentFastingType = activeSession?.FastingType.ToString(),
            StartTimeUtc = activeSession?.StartTimeUtc,
            TargetEndTimeUtc = activeSession?.TargetEndTimeUtc,
            TotalCompletedFasts = completedFasts.Count,
            TotalFastedHours = totalHours
        };
    }

    public async Task<NutritionSummaryContract> GetUserNutritionSummaryAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        var meals = await _mealRepository.WhereAsync(m => m.UserId == userId && m.LoggedAt >= startDate && m.LoggedAt <= endDate);

        if (!meals.Any())
        {
            return new NutritionSummaryContract
            {
                UserId = userId,
                AverageCalories = 0,
                AverageProtein = 0,
                AverageCarbs = 0,
                AverageFat = 0,
                TotalLoggedMeals = 0
            };
        }

        return new NutritionSummaryContract
        {
            UserId = userId,
            AverageCalories = meals.Average(m => m.TotalCalories),
            AverageProtein = meals.Average(m => m.TotalProteinGrams),
            AverageCarbs = meals.Average(m => m.TotalCarbsGrams),
            AverageFat = meals.Average(m => m.TotalFatGrams),
            TotalLoggedMeals = meals.Count
        };
    }

    public async Task<FmdCycleStatusContract> GetActiveFmdCycleAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var activeCycle = await _fmdRepository.GetActiveCycleAsync(userId);

        if (activeCycle == null)
            return new FmdCycleStatusContract { HasActiveCycle = false };

        return new FmdCycleStatusContract
        {
            HasActiveCycle = true,
            FmdCycleId = activeCycle.Id,
            CycleNumber = activeCycle.CycleNumber,
            CurrentDay = activeCycle.CurrentDay,
            Status = activeCycle.Status.ToString()
        };
    }
}

