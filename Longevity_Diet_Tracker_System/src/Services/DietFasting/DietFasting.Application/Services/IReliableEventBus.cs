using BuildingBlocks.Messaging.Abstractions;

namespace DietFasting.Application.Services;

/// <summary>
/// Event bus that reports whether the broker really accepted a message. <see cref="IEventBus.PublishAsync{TEvent}"/> stays
/// fire-and-forget (it never throws); callers that must not lose a message (fasting reminders) use this instead and retry later.
/// </summary>
public interface IReliableEventBus : IEventBus
{
    /// <param name="requireRoute">
    /// When true the message is published as "mandatory": it only counts as delivered if at least one queue received it
    /// (e.g. the Notification Service has declared its queue). Otherwise <c>false</c> is returned.
    /// </param>
    /// <returns>True only when the broker confirmed the message (and, if required, routed it to a queue).</returns>
    Task<bool> TryPublishAsync<TEvent>(TEvent @event, bool requireRoute = false, CancellationToken cancellationToken = default)
        where TEvent : class, IIntegrationEvent;
}
