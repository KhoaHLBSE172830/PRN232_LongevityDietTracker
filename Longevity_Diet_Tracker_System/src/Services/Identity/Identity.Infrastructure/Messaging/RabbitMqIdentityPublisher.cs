using System.Text;
using System.Text.Json;
using BuildingBlocks.Messaging.Abstractions;
using BuildingBlocks.Messaging.Events;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;

namespace Identity.Infrastructure.Messaging;

public class RabbitMqIdentityPublisher : IEventBus, IDisposable
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<RabbitMqIdentityPublisher> _logger;
    private IConnection? _connection;
    private IModel? _channel;
    private readonly object _lock = new();

    private const string ExchangeName = "longevity_events_exchange";

    public RabbitMqIdentityPublisher(
        IConfiguration configuration,
        ILogger<RabbitMqIdentityPublisher> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private void EnsureChannel()
    {
        if (_channel != null && _channel.IsOpen) return;

        lock (_lock)
        {
            if (_channel != null && _channel.IsOpen) return;

            try
            {
                var host = _configuration["RabbitMQ:Host"] ?? "localhost";
                var port = int.Parse(_configuration["RabbitMQ:Port"] ?? "5672");
                var username = _configuration["RabbitMQ:Username"] ?? "guest";
                var password = _configuration["RabbitMQ:Password"] ?? "guest";

                var factory = new ConnectionFactory
                {
                    HostName = host,
                    Port = port,
                    UserName = username,
                    Password = password
                };

                _connection = factory.CreateConnection();
                _channel = _connection.CreateModel();
                _channel.ExchangeDeclare(exchange: ExchangeName, type: ExchangeType.Topic, durable: true);

                _logger.LogInformation("[RabbitMQ Publisher] Connected to exchange '{Exchange}' for Identity Service", ExchangeName);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("[RabbitMQ Publisher] Could not connect to RabbitMQ broker: {Message}. Identity events will be skipped gracefully.", ex.Message);
            }
        }
    }

    public Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : class, IIntegrationEvent
    {
        try
        {
            EnsureChannel();
            if (_channel == null || !_channel.IsOpen)
            {
                _logger.LogWarning("[RabbitMQ Publisher] RabbitMQ unavailable, skipped event {EventType}", @event.EventType);
                return Task.CompletedTask;
            }

            var routingKey = @event switch
            {
                UserRegisteredIntegrationEvent => "user.registered",
                _ => $"user.{@event.EventType.ToLowerInvariant()}"
            };

            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(@event, @event.GetType()));
            var props = _channel.CreateBasicProperties();
            props.Persistent = true;
            props.MessageId = @event.Id.ToString();
            props.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());

            lock (_lock)
            {
                _channel.BasicPublish(
                    exchange: ExchangeName,
                    routingKey: routingKey,
                    basicProperties: props,
                    body: body);
            }

            _logger.LogInformation("[RabbitMQ Publisher] Published event {EventType} to exchange '{Exchange}' with key '{RoutingKey}'",
                @event.EventType, ExchangeName, routingKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RabbitMQ Publisher] Failed to publish event {EventType}", @event.EventType);
        }

        return Task.CompletedTask;
    }

    public void Dispose()
    {
        try { _channel?.Close(); } catch { /* ignore */ }
        try { _connection?.Close(); } catch { /* ignore */ }
    }
}

