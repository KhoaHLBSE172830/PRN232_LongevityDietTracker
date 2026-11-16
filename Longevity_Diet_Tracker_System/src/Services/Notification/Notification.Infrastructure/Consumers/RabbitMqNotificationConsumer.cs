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
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(5);

    public RabbitMqNotificationConsumer(
        IConfiguration configuration,
        IServiceProvider serviceProvider,
        ILogger<RabbitMqNotificationConsumer> logger)
    {
        _configuration = configuration;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var host = _configuration["RabbitMQ:Host"] ?? "localhost";
        var port = int.TryParse(_configuration["RabbitMQ:Port"], out var parsedPort) ? parsedPort : 5672;
        var username = _configuration["RabbitMQ:Username"] ?? "guest";
        var password = _configuration["RabbitMQ:Password"] ?? "guest";

        var factory = new ConnectionFactory
        {
            HostName = host,
            Port = port,
            UserName = username,
            Password = password,
            DispatchConsumersAsync = true,
            RequestedConnectionTimeout = TimeSpan.FromSeconds(3)
        };

        var warned = false;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _connection = factory.CreateConnection("notification-events-consumer");
                _channel = _connection.CreateModel();

                _channel.ExchangeDeclare(exchange: ExchangeName, type: ExchangeType.Topic, durable: true);
                _channel.QueueDeclare(queue: QueueName, durable: true, exclusive: false, autoDelete: false);
                _channel.QueueBind(queue: QueueName, exchange: ExchangeName, routingKey: "notification.#");
                _channel.QueueBind(queue: QueueName, exchange: ExchangeName, routingKey: "advice.#");
                _channel.QueueBind(queue: QueueName, exchange: ExchangeName, routingKey: "fmd.#");
                _channel.QueueBind(queue: QueueName, exchange: ExchangeName, routingKey: "consultation.#");
                _channel.BasicQos(0, 1, false);

                var consumer = new AsyncEventingBasicConsumer(_channel);
                consumer.Received += async (_, ea) => await HandleMessageAsync(_channel, ea, stoppingToken);

                _channel.BasicConsume(queue: QueueName, autoAck: false, consumer: consumer);

                _logger.LogInformation("RabbitMQ Notification Consumer listening on queue: {Queue}", QueueName);
                warned = false;

                while (_connection.IsOpen && !stoppingToken.IsCancellationRequested)
                {
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                if (!warned)
                {
                    _logger.LogWarning("RabbitMQ connection not ready ({Message}). Retrying every {Seconds}s...", ex.Message, RetryDelay.TotalSeconds);
                    warned = true;
                }
            }
            finally
            {
                try { _channel?.Close(); } catch { /* ignore */ }
                try { _connection?.Close(); } catch { /* ignore */ }
            }

            try
            {
                await Task.Delay(RetryDelay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task HandleMessageAsync(IModel channel, BasicDeliverEventArgs ea, CancellationToken stoppingToken)
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
                    var htmlBody = $"""
                        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 2px solid #dc2626; border-radius: 12px; padding: 20px; background-color: #fef2f2;">
                            <h2 style="color: #b91c1c; margin-top: 0;">⚠️ Cảnh Báo Vượt Định Mức Calo Chu Kỳ FMD (Ngày {fmdEvent.DayNumber})</h2>
                            <p style="color: #1f2937; font-size: 15px; line-height: 1.5;">{fmdEvent.Message}</p>
                            <hr style="border: none; border-top: 1px solid #fecaca; margin: 16px 0;" />
                            <p style="color: #7f1d1d; font-size: 13px; margin-bottom: 0;">
                                🌿 <strong>Giao thức FMD (Dr. Valter Longo):</strong> Để duy trì trạng thái tự thực bào (Autophagy), vui lòng giữ mức năng lượng theo từng ngày: 1100 / 780 / 760 / 760 / 780 kcal.
                            </p>
                        </div>
                        """;

                    await notificationService.SendAndLogNotificationAsync(new SendNotificationRequest(
                        fmdEvent.UserId,
                        fmdEvent.RecipientEmail ?? fmdEvent.UserId.ToString(),
                        $"FMD Cycle Day {fmdEvent.DayNumber} Alert - Calorie Limit Exceeded",
                        htmlBody,
                        string.IsNullOrWhiteSpace(fmdEvent.RecipientEmail) ? NotificationChannel.InApp : NotificationChannel.Email,
                        EventId: fmdEvent.Id.ToString()), stoppingToken);
                }
            }
            else if (routingKey.StartsWith("advice.sent"))
            {
                var adviceEvent = JsonSerializer.Deserialize<AdviceSentIntegrationEvent>(message);
                if (adviceEvent != null)
                {
                    var htmlBody = $"""
                        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #0d9488; border-radius: 12px; padding: 20px; background-color: #f0fdfa;">
                            <h2 style="color: #0f766e; margin-top: 0;">🩺 Phiếu Lời Khuyên Mới Từ Chuyên Gia Dinh Dưỡng</h2>
                            <p style="color: #1f2937; font-size: 15px; line-height: 1.5;">{adviceEvent.AdviceSummary}</p>
                            <p style="color: #475569; font-size: 12px; margin-bottom: 0;">Mã phiên tư vấn: {adviceEvent.ConsultationSessionId}</p>
                        </div>
                        """;

                    await notificationService.SendAndLogNotificationAsync(new SendNotificationRequest(
                        adviceEvent.UserId,
                        adviceEvent.RecipientEmail ?? adviceEvent.UserId.ToString(),
                        "New Nutritionist Consultation Advice Received",
                        htmlBody,
                        string.IsNullOrWhiteSpace(adviceEvent.RecipientEmail) ? NotificationChannel.InApp : NotificationChannel.Email,
                        EventId: adviceEvent.Id.ToString()), stoppingToken);
                }
            }
            else if (routingKey.StartsWith("consultation.booked"))
            {
                var bookedEvent = JsonSerializer.Deserialize<ConsultationBookedIntegrationEvent>(message);
                if (bookedEvent != null)
                {
                    var htmlBody = $"""
                        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #0284c7; border-radius: 12px; padding: 20px; background-color: #f0f9ff;">
                            <h2 style="color: #0369a1; margin-top: 0;">📅 Xác Nhận Đặt Lịch Tư Vấn Sức Khỏe Blue Zones</h2>
                            <p style="color: #1f2937; font-size: 15px;">Lịch hẹn của bạn đã được ghi nhận vào lúc: <strong>{bookedEvent.ScheduledAt:yyyy-MM-dd HH:mm} UTC</strong>.</p>
                        </div>
                        """;

                    await notificationService.SendAndLogNotificationAsync(new SendNotificationRequest(
                        bookedEvent.UserId,
                        bookedEvent.RecipientEmail ?? bookedEvent.UserId.ToString(),
                        "Consultation Booking Confirmed",
                        htmlBody,
                        string.IsNullOrWhiteSpace(bookedEvent.RecipientEmail) ? NotificationChannel.InApp : NotificationChannel.Email,
                        EventId: bookedEvent.Id.ToString()), stoppingToken);
                }
            }

            channel.BasicAck(deliveryTag: ea.DeliveryTag, multiple: false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing RabbitMQ notification message on routing key {RoutingKey}.", routingKey);
            channel.BasicNack(deliveryTag: ea.DeliveryTag, multiple: false, requeue: false);
        }
    }

    public override void Dispose()
    {
        try { _channel?.Close(); } catch { /* ignore */ }
        try { _connection?.Close(); } catch { /* ignore */ }
        base.Dispose();
    }
}
