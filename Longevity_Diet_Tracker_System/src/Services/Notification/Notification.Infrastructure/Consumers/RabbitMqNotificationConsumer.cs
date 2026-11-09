using System.Text;
using System.Text.Json;
using BuildingBlocks.Messaging.Events;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Notification.Application.DTOs;
using Notification.Application.Services;
using Notification.Domain.Enums;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Notification.Infrastructure.Consumers;

public class RabbitMqNotificationConsumer : BackgroundService
{
    private readonly IConfiguration _configuration;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RabbitMqNotificationConsumer> _logger;
    private IConnection? _connection;
    private IModel? _channel;

    private const string ExchangeName = "longevity_events_exchange";
    private const string QueueName = "notification_events_queue";

    public RabbitMqNotificationConsumer(
        IConfiguration configuration,
        IServiceProvider serviceProvider,
        ILogger<RabbitMqNotificationConsumer> logger)
    {
        _configuration = configuration;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public override Task StartAsync(CancellationToken cancellationToken)
    {
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
                Password = password,
                DispatchConsumersAsync = true
            };

            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();

            _channel.ExchangeDeclare(exchange: ExchangeName, type: ExchangeType.Topic, durable: true);
            _channel.QueueDeclare(queue: QueueName, durable: true, exclusive: false, autoDelete: false);
            _channel.QueueBind(queue: QueueName, exchange: ExchangeName, routingKey: "notification.#");
            _channel.QueueBind(queue: QueueName, exchange: ExchangeName, routingKey: "advice.#");
            _channel.QueueBind(queue: QueueName, exchange: ExchangeName, routingKey: "fmd.#");

            _logger.LogInformation("RabbitMQ Notification Consumer initialized and bound to queue: {Queue}", QueueName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("RabbitMQ connection could not be established at startup: {Message}. Background consumer will retry or run offline.", ex.Message);
        }

        return base.StartAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_channel == null)
        {
            _logger.LogWarning("RabbitMQ channel is not open. Consumer will remain idle.");
            return;
        }

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.Received += async (sender, ea) =>
        {
            var body = ea.Body.ToArray();
            var message = Encoding.UTF8.GetString(body);
            var routingKey = ea.RoutingKey;

            try
            {
                using var scope = _serviceProvider.CreateScope();
                var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

                if (routingKey.StartsWith("notification.email"))
                {
                    var emailEvent = JsonSerializer.Deserialize<SendEmailNotificationIntegrationEvent>(message);
                    if (emailEvent != null)
                    {
                        await notificationService.SendAndLogNotificationAsync(new SendNotificationRequest(
                            emailEvent.UserId,
                            emailEvent.RecipientEmail,
                            emailEvent.Subject,
                            emailEvent.BodyHtml,
                            NotificationChannel.Email,
                            EventId: emailEvent.Id.ToString()), stoppingToken);
                    }
                }
                else if (routingKey.StartsWith("fmd.alert"))
                {
                    var fmdEvent = JsonSerializer.Deserialize<FmdCycleAlertIntegrationEvent>(message);
                    if (fmdEvent != null)
                    {
                        await notificationService.SendAndLogNotificationAsync(new SendNotificationRequest(
                            fmdEvent.UserId,
                            "user@example.com",
                            $"FMD Cycle Day {fmdEvent.DayNumber} Alert",
                            fmdEvent.Message,
                            NotificationChannel.InApp,
                            EventId: fmdEvent.Id.ToString()), stoppingToken);
                    }
                }
                else if (routingKey.StartsWith("advice.sent"))
                {
                    var adviceEvent = JsonSerializer.Deserialize<AdviceSentIntegrationEvent>(message);
                    if (adviceEvent != null)
                    {
                        await notificationService.SendAndLogNotificationAsync(new SendNotificationRequest(
                            adviceEvent.UserId,
                            "user@example.com",
                            "New Nutritionist Consultation Advice Received",
                            adviceEvent.AdviceSummary,
                            NotificationChannel.InApp,
                            EventId: adviceEvent.Id.ToString()), stoppingToken);
                    }
                }

                _channel.BasicAck(deliveryTag: ea.DeliveryTag, multiple: false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing RabbitMQ notification message.");
                _channel.BasicNack(deliveryTag: ea.DeliveryTag, multiple: false, requeue: false);
            }
        };

        _channel.BasicConsume(queue: QueueName, autoAck: false, consumer: consumer);

        await Task.CompletedTask;
    }

    public override void Dispose()
    {
        _channel?.Close();
        _connection?.Close();
        base.Dispose();
    }
}

