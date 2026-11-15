using System.Text;
using System.Text.Json;
using BuildingBlocks.Messaging.Abstractions;
using BuildingBlocks.Messaging.Events;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;

namespace Consultation.Infrastructure.Messaging;

public class RabbitMqConsultationPublisher : IEventBus, IDisposable
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<RabbitMqConsultationPublisher> _logger;
    private IConnection? _connection;
    private IModel? _channel;
    private readonly object _lock = new();

    private const string ExchangeName = "longevity_events_exchange";

    public RabbitMqConsultationPublisher(
        IConfiguration configuration,
        ILogger<RabbitMqConsultationPublisher> logger)
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

                _logger.LogInformation("[RabbitMQ Publisher] Connected to exchange '{Exchange}' for Consultation Service", ExchangeName);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("[RabbitMQ Publisher] Could not connect to RabbitMQ broker: {Message}. Events will be processed gracefully.", ex.Message);
            }
        }
    }

    public async Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : class, IIntegrationEvent
    {
        try
        {
            EnsureChannel();

            if (_channel == null || !_channel.IsOpen)
            {
                _logger.LogWarning("[RabbitMQ Publisher] Channel is offline. Skipping publishing event {EventName}", typeof(TEvent).Name);
                return;
            }

            var routingKey = ResolveRoutingKey(@event);
            var json = JsonSerializer.Serialize(@event);
            var body = Encoding.UTF8.GetBytes(json);

            var properties = _channel.CreateBasicProperties();
            properties.Persistent = true;
            properties.Type = @event.EventType;

            _channel.BasicPublish(
                exchange: ExchangeName,
                routingKey: routingKey,
                basicProperties: properties,
                body: body);

            _logger.LogInformation("[RabbitMQ Publisher] Published {EventName} with routing key '{RoutingKey}' (Event ID: {EventId})", 
                @event.EventType, routingKey, @event.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[RabbitMQ Publisher] Failed to publish event {EventName}", typeof(TEvent).Name);
        }

        await Task.CompletedTask;
    }

    private static string ResolveRoutingKey(IIntegrationEvent @event)
    {
        return @event switch
        {
            AdviceSentIntegrationEvent => "advice.sent",
            ConsultationBookedIntegrationEvent => "consultation.booked",
            _ => $"consultation.{@event.EventType.ToLowerInvariant()}"
        };
    }

    public void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
    }
}

