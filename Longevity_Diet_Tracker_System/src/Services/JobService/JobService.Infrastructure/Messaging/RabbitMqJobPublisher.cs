using BuildingBlocks.Messaging.Abstractions;

namespace JobService.Infrastructure.Messaging;

public class RabbitMqJobPublisher : IEventBus
{
    public async Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default) 
        where TEvent : class, IIntegrationEvent
    {
        // Integration point to RabbitMQ channel or MassTransit endpoint
        Console.WriteLine($"[JobService] Published event {@event.EventType} with ID {@event.Id} to RabbitMQ");
        await Task.CompletedTask;
    }
}
