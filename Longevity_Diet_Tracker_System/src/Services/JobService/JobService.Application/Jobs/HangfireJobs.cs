using BuildingBlocks.Messaging.Abstractions;
using BuildingBlocks.Messaging.Events;

namespace JobService.Application.Jobs;

/// <summary>
/// Recurring schedule (UTC). Jobs ONLY publish a trigger event to RabbitMQ: the Job Service never reads other
/// services' databases (AGENT.md WARNING 2), the owning service reacts to the trigger on its own data.
/// </summary>
public static class JobSchedule
{
    public const string FastingCheckId = "fasting-schedule-check";
    public const string FastingCheckCron = "*/15 * * * *";      // every 15 minutes

    public const string FmdDailyCheckId = "fmd-daily-check";
    public const string FmdDailyCheckCron = "0 0 * * *";        // every day 00:00 UTC

    public const string WeeklySummaryId = "weekly-nutrition-summary";
    public const string WeeklySummaryCron = "0 8 * * 1";        // every Monday 08:00 UTC
}

public interface IFastingScheduleJob
{
    Task ExecuteAsync(CancellationToken cancellationToken = default);
}

public interface IFmdCycleDailyJob
{
    Task ExecuteAsync(CancellationToken cancellationToken = default);
}

public interface IWeeklyNutritionSummaryJob
{
    Task ExecuteAsync(CancellationToken cancellationToken = default);
}

public class FastingScheduleJob : IFastingScheduleJob
{
    private readonly IEventBus? _eventBus;

    public FastingScheduleJob(IEventBus? eventBus = null)
    {
        _eventBus = eventBus;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        // Periodic check on ongoing fasts, triggers RabbitMQ event for DietFasting / Notification
        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new FastingScheduleTriggerIntegrationEvent(
                DateTime.UtcNow, nameof(FastingScheduleJob)), cancellationToken);
        }
    }
}

public class FmdCycleDailyJob : IFmdCycleDailyJob
{
    private readonly IEventBus? _eventBus;

    public FmdCycleDailyJob(IEventBus? eventBus = null)
    {
        _eventBus = eventBus;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        // Daily check on FMD 5-day cycle stages
        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new FastingScheduleTriggerIntegrationEvent(
                DateTime.UtcNow, nameof(FmdCycleDailyJob)), cancellationToken);
        }
    }
}

public class WeeklyNutritionSummaryJob : IWeeklyNutritionSummaryJob
{
    private readonly IEventBus? _eventBus;

    public WeeklyNutritionSummaryJob(IEventBus? eventBus = null)
    {
        _eventBus = eventBus;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        // Weekly nutrition recap trigger
        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new FastingScheduleTriggerIntegrationEvent(
                DateTime.UtcNow, nameof(WeeklyNutritionSummaryJob)), cancellationToken);
        }
    }
}
