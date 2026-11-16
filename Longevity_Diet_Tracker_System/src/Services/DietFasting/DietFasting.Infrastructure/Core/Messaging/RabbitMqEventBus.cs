using System.Text.Json;
using BuildingBlocks.Messaging.Abstractions;
using DietFasting.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;

namespace DietFasting.Infrastructure.Core.Messaging;

/// <summary>
/// Publishes integration events of the Diet &amp; Fasting service to RabbitMQ.
/// Exchange: <c>longevity_events_exchange</c> (topic, durable). Routing key is derived from the event type.
/// <para>
/// Every message is sent with publisher confirms, so <see cref="TryPublishAsync{TEvent}"/> only returns true once the broker
/// accepted it. <see cref="PublishAsync{TEvent}"/> is best-effort: if the broker is unreachable the business operation is NOT
/// rolled back, the failure is logged and the connection is retried after a short cool-down.
/// </para>
/// </summary>
public sealed class RabbitMqEventBus : IReliableEventBus, IDisposable
{
    public const string ExchangeName = "longevity_events_exchange";

    // Routing keys must match the bindings declared by Notification Service (notification.#, advice.#, fmd.#, fasting.#).
    private static readonly Dictionary<string, string> RoutingKeys = new()
    {
        ["FastingStartedIntegrationEvent"] = "fasting.started",
        ["FastingCompletedIntegrationEvent"] = "fasting.completed",
        ["FmdCycleAlertIntegrationEvent"] = "fmd.alert",
        ["MealLoggedIntegrationEvent"] = "meal.logged",
        ["SendEmailNotificationIntegrationEvent"] = "notification.email"
    };

    // After a failed publish the broker is considered down for this long, so request threads (e.g. logging a meal)
    // are not slowed down by repeated connection attempts.
    private static readonly TimeSpan FailureCooldown = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan ConfirmTimeout = TimeSpan.FromSeconds(5);

    private readonly ConnectionFactory _factory;
    private readonly ILogger<RabbitMqEventBus> _logger;
    private readonly object _sync = new();
    private IConnection? _connection;
    private IModel? _channel;
    private DateTime _suspendedUntilUtc = DateTime.MinValue;
    private volatile bool _lastMessageReturned;

    public RabbitMqEventBus(IConfiguration configuration, ILogger<RabbitMqEventBus> logger)
    {
        _logger = logger;
        _factory = new ConnectionFactory
        {
            HostName = configuration["RabbitMQ:Host"] ?? "localhost",
            Port = int.TryParse(configuration["RabbitMQ:Port"], out var port) ? port : 5672,
            UserName = configuration["RabbitMQ:Username"] ?? "guest",
            Password = configuration["RabbitMQ:Password"] ?? "guest",
            RequestedConnectionTimeout = TimeSpan.FromSeconds(3),
            AutomaticRecoveryEnabled = true
        };
    }

    public async Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : class, IIntegrationEvent
        => await TryPublishAsync(@event, requireRoute: false, cancellationToken);

    public async Task<bool> TryPublishAsync<TEvent>(TEvent @event, bool requireRoute = false, CancellationToken cancellationToken = default)
        where TEvent : class, IIntegrationEvent
    {
        cancellationToken.ThrowIfCancellationRequested();

        var routingKey = ResolveRoutingKey(@event.EventType);
        var body = JsonSerializer.SerializeToUtf8Bytes(@event, @event.GetType());

        // RabbitMQ.Client 6.x is synchronous: run on the thread pool so request threads are not blocked.
        return await Task.Run(() =>
        {
            try
            {
                lock (_sync)
                {
                    if (DateTime.UtcNow < _suspendedUntilUtc)
                    {
                        _logger.LogDebug("RabbitMQ is suspended after a failure; not publishing {EventType} ({EventId})",
                            @event.EventType, @event.Id);
                        return false;
                    }

                    EnsureChannel();
                    var props = _channel!.CreateBasicProperties();
                    props.Persistent = true;
                    props.ContentType = "application/json";
                    props.MessageId = @event.Id.ToString();
                    props.Type = @event.EventType;

                    _lastMessageReturned = false;
                    _channel.BasicPublish(ExchangeName, routingKey, requireRoute, props, body);
                    _channel.WaitForConfirmsOrDie(ConfirmTimeout);   // throws on NACK / timeout

                    if (requireRoute && _lastMessageReturned)
                    {
                        // Broker is healthy but no queue is bound yet (consumer service not started): not a connection failure.
                        _logger.LogWarning("{EventType} ({EventId}) was not routed to any queue (routing key {RoutingKey})",
                            @event.EventType, @event.Id, routingKey);
                        return false;
                    }
                }

                _logger.LogInformation("Published {EventType} ({EventId}) with routing key {RoutingKey}",
                    @event.EventType, @event.Id, routingKey);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not publish {EventType} ({EventId}) to RabbitMQ.", @event.EventType, @event.Id);
                lock (_sync)
                {
                    CloseQuietly();
                    _suspendedUntilUtc = DateTime.UtcNow.Add(FailureCooldown);
                }
                return false;
            }
        }, cancellationToken);
    }

    private void EnsureChannel()
    {
        if (_connection is { IsOpen: true } && _channel is { IsOpen: true })
            return;

        CloseQuietly();
        _connection = _factory.CreateConnection("diet-fasting-service");
        _channel = _connection.CreateModel();
        _channel.ConfirmSelect();
        _channel.BasicReturn += (_, _) => _lastMessageReturned = true;
        _channel.ExchangeDeclare(ExchangeName, ExchangeType.Topic, durable: true);
    }

    private void CloseQuietly()
    {
        try { _channel?.Close(); } catch { /* ignore */ }
        try { _connection?.Close(); } catch { /* ignore */ }
        _channel = null;
        _connection = null;
    }

    private static string ResolveRoutingKey(string eventType) =>
        RoutingKeys.TryGetValue(eventType, out var key)
            ? key
            : eventType.Replace("IntegrationEvent", string.Empty).ToLowerInvariant();

    public void Dispose()
    {
        lock (_sync) { CloseQuietly(); }
    }
}
