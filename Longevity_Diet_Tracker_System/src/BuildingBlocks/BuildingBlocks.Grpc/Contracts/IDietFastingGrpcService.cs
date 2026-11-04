namespace BuildingBlocks.Grpc.Contracts;

public class FastingSummaryContract
{
    public Guid UserId { get; set; }
    public bool IsCurrentlyFasting { get; set; }
    public string? CurrentFastingType { get; set; }
    public DateTime? StartTimeUtc { get; set; }
    public DateTime? TargetEndTimeUtc { get; set; }
    public int TotalCompletedFasts { get; set; }
    public double TotalFastedHours { get; set; }
}

public class NutritionSummaryContract
{
    public Guid UserId { get; set; }
    public double AverageCalories { get; set; }
    public double AverageProtein { get; set; }
    public double AverageCarbs { get; set; }
    public double AverageFat { get; set; }
    public int TotalLoggedMeals { get; set; }
}

public class FmdCycleStatusContract
{
    public bool HasActiveCycle { get; set; }
    public Guid? FmdCycleId { get; set; }
    public int CycleNumber { get; set; }
    public int CurrentDay { get; set; }
    public string? Status { get; set; }
}

public interface IDietFastingGrpcClientService
{
    Task<FastingSummaryContract> GetUserFastingSummaryAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<NutritionSummaryContract> GetUserNutritionSummaryAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<FmdCycleStatusContract> GetActiveFmdCycleAsync(Guid userId, CancellationToken cancellationToken = default);
}

