using System.Globalization;
using BuildingBlocks.Grpc.Contracts;
using BuildingBlocks.Grpc.Protos;
using Grpc.Core;
using Microsoft.Extensions.Logging;

namespace DietFasting.Infrastructure.Core.Grpc;

/// <summary>
/// Real gRPC endpoint (HTTP/2, port 7002) of the Diet &amp; Fasting service.
/// It is a thin transport adapter: all data access lives in <see cref="IDietFastingGrpcClientService"/>
/// (implemented by <see cref="DietFastingGrpcServer"/>), so there is no business logic in the gRPC handler (AGENT.md WARNING 1).
/// </summary>
public class DietFastingGrpcService : DietFastingGrpc.DietFastingGrpcBase
{
    private const int DefaultSummaryDays = 7;

    private readonly IDietFastingGrpcClientService _service;
    private readonly ILogger<DietFastingGrpcService> _logger;

    public DietFastingGrpcService(IDietFastingGrpcClientService service, ILogger<DietFastingGrpcService> logger)
    {
        _service = service;
        _logger = logger;
    }

    public override async Task<UserFastingSummaryResponse> GetUserFastingSummary(
        UserFastingSummaryRequest request, ServerCallContext context)
    {
        var userId = ParseUserId(request.UserId);
        var data = await _service.GetUserFastingSummaryAsync(userId, context.CancellationToken);

        return new UserFastingSummaryResponse
        {
            UserId = data.UserId.ToString(),
            IsCurrentlyFasting = data.IsCurrentlyFasting,
            CurrentFastingType = data.CurrentFastingType ?? string.Empty,
            StartTimeUtc = ToIso(data.StartTimeUtc),
            TargetEndTimeUtc = ToIso(data.TargetEndTimeUtc),
            TotalCompletedFasts = data.TotalCompletedFasts,
            TotalFastedHours = data.TotalFastedHours
        };
    }

    public override async Task<UserNutritionSummaryResponse> GetUserNutritionSummary(
        UserNutritionSummaryRequest request, ServerCallContext context)
    {
        var userId = ParseUserId(request.UserId);

        // Empty dates => last 7 days (the window the nutritionist reviews).
        var end = ParseDate(request.EndDate, "end_date") ?? DateTime.UtcNow;
        var start = ParseDate(request.StartDate, "start_date") ?? end.AddDays(-DefaultSummaryDays);
        if (start > end)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "start_date must be earlier than or equal to end_date."));

        var data = await _service.GetUserNutritionSummaryAsync(userId, start, end, context.CancellationToken);

        return new UserNutritionSummaryResponse
        {
            UserId = data.UserId.ToString(),
            AverageCalories = data.AverageCalories,
            AverageProtein = data.AverageProtein,
            AverageCarbs = data.AverageCarbs,
            AverageFat = data.AverageFat,
            TotalLoggedMeals = data.TotalLoggedMeals
        };
    }

    public override async Task<ActiveFmdCycleResponse> GetActiveFmdCycle(
        ActiveFmdCycleRequest request, ServerCallContext context)
    {
        var userId = ParseUserId(request.UserId);
        var data = await _service.GetActiveFmdCycleAsync(userId, context.CancellationToken);

        return new ActiveFmdCycleResponse
        {
            HasActiveCycle = data.HasActiveCycle,
            FmdCycleId = data.FmdCycleId?.ToString() ?? string.Empty,
            CycleNumber = data.CycleNumber,
            CurrentDay = data.CurrentDay,
            Status = data.Status ?? string.Empty
        };
    }

    private Guid ParseUserId(string value)
    {
        if (!Guid.TryParse(value, out var id) || id == Guid.Empty)
        {
            _logger.LogWarning("gRPC call rejected: invalid user_id '{UserId}'", value);
            throw new RpcException(new Status(StatusCode.InvalidArgument, "user_id must be a valid non-empty GUID."));
        }

        return id;
    }

    private static DateTime? ParseDate(string value, string field)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (!DateTime.TryParse(value, CultureInfo.InvariantCulture,
                DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var parsed))
            throw new RpcException(new Status(StatusCode.InvalidArgument, $"{field} must be an ISO-8601 date."));

        return parsed;
    }

    private static string ToIso(DateTime? value) =>
        value.HasValue ? value.Value.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture) : string.Empty;
}
