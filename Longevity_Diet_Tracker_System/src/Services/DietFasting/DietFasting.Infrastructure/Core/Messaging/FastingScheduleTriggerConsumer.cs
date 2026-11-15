using System.Text.Json;
using BuildingBlocks.Messaging.Events;
using DietFasting.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace DietFasting.Infrastructure.Core.Messaging;

/// <summary>
/// Listens to the Job Service trigger (<c>fasting.schedule.trigger</c>) on its OWN queue and reacts on this service's own data
/// (the Job Service never reads <c>diet_db</c>). Unlike a one-shot connect, it keeps retrying until RabbitMQ is available.
/// </summary>
public sealed class FastingScheduleTriggerConsumer : BackgroundService
{
    private const string QueueName = "diet_fasting_trigger_queue";
    private const string RoutingKey = "fasting.schedule.trigger";

    // Name published by Job Service (FastingScheduleTriggerIntegrationEvent.JobName). Not referenced from JobService on purpose.
    private const string FastingCheckJobName = "FastingScheduleJob";

    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(10);

    private readonly ConnectionFactory _factory;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<FastingScheduleTriggerConsumer> _logger;

    public FastingScheduleTriggerConsumer(
        IConfiguration configuration,
        IServiceScopeFactory scopeFactory,
        ILogger<FastingScheduleTriggerConsumer> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _factory = new ConnectionFactory
        {
            HostName = configuration["RabbitMQ:Host"] ?? "localhost",
            Port = int.TryParse(configuration["RabbitMQ:Port"], out var port) ? port : 5672,
            UserName = configuration["RabbitMQ:Username"] ?? "guest",
            Password = configuration["RabbitMQ:Password"] ?? "guest",
            RequestedConnectionTimeout = TimeSpan.FromSeconds(3),
            DispatchConsumersAsync = true,          // required for AsyncEventingBasicConsumer
            AutomaticRecoveryEnabled = false        // this loop re-creates the connection itself
        };
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var warned = false;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var connection = _factory.CreateConnection("diet-fasting-trigger-consumer");
                using var channel = connection.CreateModel();

                channel.ExchangeDeclare(RabbitMqEventBus.ExchangeName, ExchangeType.Topic, durable: true);
                channel.QueueDeclare(QueueName, durable: true, exclusive: false, autoDelete: false);
                channel.QueueBind(QueueName, RabbitMqEventBus.ExchangeName, RoutingKey);
                channel.BasicQos(0, 1, false);

                var consumer = new AsyncEventingBasicConsumer(channel);
                consumer.Received += (_, ea) => HandleAsync(channel, ea, stoppingToken);
                channel.BasicConsume(QueueName, autoAck: false, consumer);

                _logger.LogInformation("Fasting trigger consumer listening on queue {Queue} (routing key {RoutingKey})", QueueName, RoutingKey);
                warned = false;

                while (connection.IsOpen && !stoppingToken.IsCancellationRequested)
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                if (!warned)
                {
                    _logger.LogWarning("Fasting trigger consumer cannot reach RabbitMQ ({Message}). Retrying every {Seconds}s.",
                        ex.Message, RetryDelay.TotalSeconds);
                    warned = true;
                }
            }

            try { await Task.Delay(RetryDelay, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task HandleAsync(IModel channel, BasicDeliverEventArgs ea, CancellationToken cancellationToken)
    {
        try
        {
            var trigger = JsonSerializer.Deserialize<FastingScheduleTriggerIntegrationEvent>(ea.Body.Span);
            if (trigger is null)
            {
                _logger.LogWarning("Discarding empty/invalid trigger message {DeliveryTag}", ea.DeliveryTag);
                channel.BasicAck(ea.DeliveryTag, multiple: false);
                return;
            }

            if (trigger.JobName == FastingCheckJobName)
            {
                using var scope = _scopeFactory.CreateScope();
                var reminders = scope.ServiceProvider.GetRequiredService<IFastingReminderService>();
                var result = await reminders.SendDueRemindersAsync(cancellationToken);
                _logger.LogInformation("Trigger {EventId} ({JobName}): {Count} fasting reminder(s) published, {Deferred} deferred to the next trigger",
                    trigger.Id, trigger.JobName, result.Sent, result.Deferred);
            }
            else
            {
                // FMD daily check / weekly summary belong to other modules: no handler registered yet.
                _logger.LogInformation("Trigger {EventId} ({JobName}) received but no handler is registered for it", trigger.Id, trigger.JobName);
            }

            channel.BasicAck(ea.DeliveryTag, multiple: false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while handling fasting trigger message {DeliveryTag}", ea.DeliveryTag);
            try { channel.BasicNack(ea.DeliveryTag, multiple: false, requeue: false); }
            catch (Exception nackEx) { _logger.LogWarning(nackEx, "Could not NACK message {DeliveryTag}", ea.DeliveryTag); }
        }
    }
}
