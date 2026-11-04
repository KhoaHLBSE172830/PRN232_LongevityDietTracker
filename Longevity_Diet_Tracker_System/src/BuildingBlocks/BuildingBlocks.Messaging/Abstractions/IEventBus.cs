namespace BuildingBlocks.Messaging.Abstractions;

public interface IIntegrationEvent
{
    Guid Id { get; }
    DateTime OccurredOnUtc { get; }
    string EventType { get; }
}

public abstract record IntegrationEvent : IIntegrationEvent
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTime OccurredOnUtc { get; init; } = DateTime.UtcNow;
    public virtual string EventType => GetType().Name;
}

public interface IEventBus
{
    Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default) 
        where TEvent : class, IIntegrationEvent;
}

