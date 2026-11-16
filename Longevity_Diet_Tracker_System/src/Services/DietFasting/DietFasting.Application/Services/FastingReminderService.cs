using System.Security.Cryptography;
using System.Text;
using BuildingBlocks.Messaging.Events;
using DietFasting.Application.Repositories;
using DietFasting.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace DietFasting.Application.Services;

/// <summary>
/// Remembers which fasting sessions were already reminded (AGENT.md WARNING 5: idempotency).
/// Three steps so a reminder is never lost and never sent twice by concurrent triggers:
/// acquire a short lease, publish, then commit (long TTL) on success or release the lease on failure.
/// Implemented in Infrastructure with Redis (atomic SET NX) and an in-memory fallback.
/// </summary>
public interface IReminderDedupStore
{
    /// <summary>Returns true only for the FIRST caller; the key is held for <paramref name="lease"/> unless committed.</summary>
    Task<bool> TryAcquireAsync(string key, TimeSpan lease, CancellationToken cancellationToken = default);

    /// <summary>Marks the key as done for <paramref name="timeToLive"/> (the reminder was delivered).</summary>
    Task CommitAsync(string key, TimeSpan timeToLive, CancellationToken cancellationToken = default);

    /// <summary>Frees the key so the next trigger retries (the reminder could not be delivered).</summary>
    Task ReleaseAsync(string key, CancellationToken cancellationToken = default);
}

public readonly record struct ReminderRunResult(int Sent, int Deferred);

public interface IFastingReminderService
{
    /// <summary>
    /// Publishes a reminder for every fasting session ending soon (or just overdue).
    /// <c>Deferred</c> counts reminders that could not be delivered now and will be retried by the next trigger.
    /// </summary>
    Task<ReminderRunResult> SendDueRemindersAsync(CancellationToken cancellationToken = default);
}

public class FastingReminderService : IFastingReminderService
{
    /// <summary>A session is reminded when it ends within this lead time (matches the 15-minute Hangfire schedule).</summary>
    public static readonly TimeSpan LeadTime = TimeSpan.FromMinutes(15);

    /// <summary>Sessions that ended longer ago than this are no longer reminded.</summary>
    public static readonly TimeSpan MaxOverdue = TimeSpan.FromHours(24);

    // Must outlive the reminder window (LeadTime + MaxOverdue) so a delivered reminder can never be repeated.
    private static readonly TimeSpan DedupTtl = TimeSpan.FromHours(48);

    // Protects against two triggers processing the same session at the same time.
    private static readonly TimeSpan InFlightLease = TimeSpan.FromMinutes(2);

    // Used only for sessions whose JWT carried no e-mail (e.g. started before this field existed).
    private const string FallbackRecipientEmail = "user@example.com";

    private readonly IFastingSessionRepository _fastingRepository;
    private readonly IReminderDedupStore _dedupStore;
    private readonly IReliableEventBus _eventBus;
    private readonly ILogger<FastingReminderService> _logger;

    public FastingReminderService(
        IFastingSessionRepository fastingRepository,
        IReminderDedupStore dedupStore,
        IReliableEventBus eventBus,
        ILogger<FastingReminderService> logger)
    {
        _fastingRepository = fastingRepository;
        _dedupStore = dedupStore;
        _eventBus = eventBus;
        _logger = logger;
    }

    public async Task<ReminderRunResult> SendDueRemindersAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var windowEnd = now.Add(LeadTime);
        var windowStart = now.Subtract(MaxOverdue);

        var due = await _fastingRepository.WhereAsync(s =>
            s.Status == FastingStatus.InProgress &&
            s.PausedAtUtc == null &&   // phiên tạm dừng không nhắc: mốc kết thúc sẽ dời khi tiếp tục
            s.TargetEndTimeUtc <= windowEnd &&
            s.TargetEndTimeUtc >= windowStart);

        var sent = 0;
        var deferred = 0;
        foreach (var session in due)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var key = $"fasting:reminder:{session.Id}";
            if (!await _dedupStore.TryAcquireAsync(key, InFlightLease, cancellationToken))
                continue;   // already delivered, or being processed by another trigger

            var delivered = false;
            try
            {
                var overdue = session.TargetEndTimeUtc <= now;
                var subject = overdue
                    ? $"Bạn đã đạt mục tiêu nhịn ăn {FormatType(session.FastingType)}"
                    : $"Phiên nhịn ăn {FormatType(session.FastingType)} sắp kết thúc";
                var body = overdue
                    ? $"<p>Phiên nhịn ăn bắt đầu lúc <b>{session.StartTimeUtc:HH:mm dd/MM/yyyy} UTC</b> đã đạt mục tiêu " +
                      $"({session.TargetHours:0.#} giờ). Bạn có thể kết thúc phiên và ăn bữa đầu tiên theo nguyên tắc Hara Hachi Bu.</p>"
                    : $"<p>Phiên nhịn ăn của bạn sẽ đạt mục tiêu <b>{session.TargetHours:0.#} giờ</b> vào lúc " +
                      $"<b>{session.TargetEndTimeUtc:HH:mm dd/MM/yyyy} UTC</b>. Hãy uống đủ nước lọc hoặc trà thảo mộc không đường.</p>";

                // Deterministic event id: if a crash happens between publish and commit the retry re-sends the SAME id,
                // and the Notification Service (HasEventBeenProcessedAsync) drops the duplicate.
                var message = new SendEmailNotificationIntegrationEvent(
                    session.UserId, session.NotificationEmail ?? FallbackRecipientEmail, subject, body)
                {
                    Id = DeterministicEventId(session.Id)
                };

                // requireRoute: if no queue is bound yet (Notification not started) the reminder is deferred, not lost.
                delivered = await _eventBus.TryPublishAsync(message, requireRoute: true, cancellationToken);
            }
            finally
            {
                if (delivered)
                    await _dedupStore.CommitAsync(key, DedupTtl, CancellationToken.None);
                else
                    await _dedupStore.ReleaseAsync(key, CancellationToken.None);
            }

            if (delivered)
            {
                sent++;
            }
            else
            {
                deferred++;
                _logger.LogWarning("Reminder for fasting session {SessionId} could not be delivered; it will be retried by the next trigger.", session.Id);
            }
        }

        return new ReminderRunResult(sent, deferred);
    }

    private static Guid DeterministicEventId(Guid sessionId)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes($"fasting-reminder:{sessionId}"));
        return new Guid(hash.AsSpan(0, 16));
    }

    private static string FormatType(FastingType type) => type switch
    {
        FastingType.Circadian => "12:12",
        FastingType.Intermittent14_10 => "14:10",
        FastingType.Intermittent16_8 => "16:8",
        FastingType.Intermittent18_6 => "18:6",
        FastingType.Intermittent20_4 => "20:4",
        FastingType.Extended => "kéo dài",
        FastingType.FmdProtocol => "FMD",
        _ => type.ToString()
    };
}
