using BuildingBlocks.Messaging.Abstractions;
using BuildingBlocks.Messaging.Events;

namespace JobService.Application.Jobs;

public interface IFastingScheduleJob
{
    Task ExecuteAsync(CancellationToken cancellationToken = default);
}

public interface IFmdCycleDailyJob
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

