using BuildingBlocks.Grpc.Contracts;
using BuildingBlocks.Grpc.Protos;
using Consultation.Domain.Exceptions;
using Grpc.Net.Client;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Consultation.Infrastructure.Core.Grpc;

public class DietFastingGrpcClient : IDietFastingGrpcClientService
{
    private readonly string _grpcUrl;
    private readonly ILogger<DietFastingGrpcClient> _logger;

    public DietFastingGrpcClient(IConfiguration configuration, ILogger<DietFastingGrpcClient> logger)
    {
        _logger = logger;
        _grpcUrl = configuration["GrpcSettings:DietFastingUrl"] ?? "http://localhost:7002";
    }

    public async Task<FastingSummaryContract> GetUserFastingSummaryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var channel = GrpcChannel.ForAddress(_grpcUrl);
            var client = new DietFastingGrpc.DietFastingGrpcClient(channel);
            var response = await client.GetUserFastingSummaryAsync(
                new UserFastingSummaryRequest { UserId = userId.ToString() }, 
                cancellationToken: cancellationToken);

            DateTime? startTime = DateTime.TryParse(response.StartTimeUtc, out var s) ? s : null;
            DateTime? targetEndTime = DateTime.TryParse(response.TargetEndTimeUtc, out var t) ? t : null;

            return new FastingSummaryContract
            {
                UserId = userId,
                IsCurrentlyFasting = response.IsCurrentlyFasting,
                CurrentFastingType = response.CurrentFastingType,
                StartTimeUtc = startTime,
                TargetEndTimeUtc = targetEndTime,
                TotalCompletedFasts = response.TotalCompletedFasts,
                TotalFastedHours = response.TotalFastedHours
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call DietFasting gRPC GetUserFastingSummary on {Url}.", _grpcUrl);
            throw new ServiceUnavailableException("Dịch vụ theo dõi nhịn ăn (DietFasting gRPC) tạm thời không khả dụng.");
        }
    }

    public async Task<NutritionSummaryContract> GetUserNutritionSummaryAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        try
        {
            using var channel = GrpcChannel.ForAddress(_grpcUrl);
            var client = new DietFastingGrpc.DietFastingGrpcClient(channel);
            var response = await client.GetUserNutritionSummaryAsync(new UserNutritionSummaryRequest
            {
                UserId = userId.ToString(),
                StartDate = startDate.ToString("O"),
                EndDate = endDate.ToString("O")
            }, cancellationToken: cancellationToken);

            return new NutritionSummaryContract
            {
                UserId = userId,
                AverageCalories = response.AverageCalories,
                AverageProtein = response.AverageProtein,
                AverageCarbs = response.AverageCarbs,
                AverageFat = response.AverageFat,
                TotalLoggedMeals = response.TotalLoggedMeals
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call DietFasting gRPC GetUserNutritionSummary on {Url}.", _grpcUrl);
            throw new ServiceUnavailableException("Dịch vụ theo dõi dinh dưỡng (DietFasting gRPC) tạm thời không khả dụng.");
        }
    }

    public async Task<FmdCycleStatusContract> GetActiveFmdCycleAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var channel = GrpcChannel.ForAddress(_grpcUrl);
            var client = new DietFastingGrpc.DietFastingGrpcClient(channel);
            var response = await client.GetActiveFmdCycleAsync(
                new ActiveFmdCycleRequest { UserId = userId.ToString() }, 
                cancellationToken: cancellationToken);

            Guid? cycleId = Guid.TryParse(response.FmdCycleId, out var cid) ? cid : null;

            return new FmdCycleStatusContract
            {
                HasActiveCycle = response.HasActiveCycle,
                FmdCycleId = cycleId,
                CycleNumber = response.CycleNumber,
                CurrentDay = response.CurrentDay,
                Status = response.Status
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call DietFasting gRPC GetActiveFmdCycle on {Url}.", _grpcUrl);
            throw new ServiceUnavailableException("Dịch vụ theo dõi chu kỳ FMD (DietFasting gRPC) tạm thời không khả dụng.");
        }
    }
}
