using BuildingBlocks.Grpc.Contracts;
using Microsoft.Extensions.Configuration;

namespace Consultation.Infrastructure.Core.Grpc;

public class DietFastingGrpcClient : IDietFastingGrpcClientService
{
    private readonly IConfiguration _configuration;

    public DietFastingGrpcClient(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<FastingSummaryContract> GetUserFastingSummaryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await Task.Yield();
        return new FastingSummaryContract
        {
            UserId = userId,
            IsCurrentlyFasting = true,
            CurrentFastingType = "Intermittent16_8",
            StartTimeUtc = DateTime.UtcNow.AddHours(-14),
            TargetEndTimeUtc = DateTime.UtcNow.AddHours(2),
            TotalCompletedFasts = 24,
            TotalFastedHours = 384
        };
    }

    public async Task<NutritionSummaryContract> GetUserNutritionSummaryAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        await Task.Yield();
        return new NutritionSummaryContract
        {
            UserId = userId,
            AverageCalories = 1850,
            AverageProtein = 85,
            AverageCarbs = 210,
            AverageFat = 55,
            TotalLoggedMeals = 45
        };
    }

    public async Task<FmdCycleStatusContract> GetActiveFmdCycleAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await Task.Yield();
        return new FmdCycleStatusContract
        {
            HasActiveCycle = true,
            FmdCycleId = Guid.NewGuid(),
            CycleNumber = 2,
            CurrentDay = 3,
            Status = "Active"
        };
    }
}

