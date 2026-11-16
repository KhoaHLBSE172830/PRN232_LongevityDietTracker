using System.Text.Json;
using BuildingBlocks.Messaging.Abstractions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;

namespace JobService.Infrastructure.Messaging;

/// <summary>
/// Publishes trigger events of the Job Service to RabbitMQ (exchange <c>longevity_events_exchange</c>, topic, durable).
/// Best-effort: a broker outage is logged and never crashes a Hangfire job; the next run retries the connection.
/// </summary>
public sealed class RabbitMqJobPublisher : IEventBus, IDisposable
{
    public const string ExchangeName = "longevity_events_exchange";

    private static readonly Dictionary<string, string> RoutingKeys = new()
    {
        ["FastingScheduleTriggerIntegrationEvent"] = "fasting.schedule.trigger"
    };

    private readonly ConnectionFactory _factory;
    private readonly ILogger<RabbitMqJobPublisher> _logger;
    private readonly object _sync = new();
    private IConnection? _connection;
    private IModel? _channel;

    public RabbitMqJobPublisher(IConfiguration configuration, ILogger<RabbitMqJobPublisher> logger)
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
    {
        cancellationToken.ThrowIfCancellationRequested();

        var routingKey = RoutingKeys.TryGetValue(@event.EventType, out var key)
            ? key
            : @event.EventType.Replace("IntegrationEvent", string.Empty).ToLowerInvariant();
        var body = JsonSerializer.SerializeToUtf8Bytes(@event, @event.GetType());

        await Task.Run(() =>
        {
            try
            {
                lock (_sync)
                {
                    EnsureChannel();
                    var props = _channel!.CreateBasicProperties();
                    props.Persistent = true;
                    props.ContentType = "application/json";
                    props.MessageId = @event.Id.ToString();
                    props.Type = @event.EventType;
                    _channel.BasicPublish(ExchangeName, routingKey, props, body);
                }

                _logger.LogInformation("[JobService] Published {EventType} ({EventId}) with routing key {RoutingKey}",
                    @event.EventType, @event.Id, routingKey);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[JobService] Could not publish {EventType} ({EventId}) to RabbitMQ.",
                    @event.EventType, @event.Id);
                lock (_sync) { CloseQuietly(); }
            }
        }, cancellationToken);
    }

    private void EnsureChannel()
    {
        if (_connection is { IsOpen: true } && _channel is { IsOpen: true })
            return;

        CloseQuietly();
        _connection = _factory.CreateConnection("job-service");
        _channel = _connection.CreateModel();
        _channel.ExchangeDeclare(ExchangeName, ExchangeType.Topic, durable: true);
    }

    private void CloseQuietly()
    {
        try { _channel?.Close(); } catch { /* ignore */ }
        try { _connection?.Close(); } catch { /* ignore */ }
        _channel = null;
        _connection = null;
    }

    public void Dispose()
    {
        lock (_sync) { CloseQuietly(); }
    }
}
