using BuildingBlocks.Common.Entities;
using Notification.Domain.Enums;

namespace Notification.Domain.Entities;

public class NotificationLog : BaseEntity
{
    public Guid UserId { get; set; }
    public string Recipient { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public NotificationChannel Channel { get; set; } = NotificationChannel.Email;
    public NotificationStatus Status { get; set; } = NotificationStatus.Pending;
    public DateTime? SentAtUtc { get; set; }
    public string? ErrorMessage { get; set; }
    public string? EventId { get; set; } // For Idempotency check (AGENT.md Warning 5)

    public NotificationLog() { }

    public NotificationLog(Guid userId, string recipient, string subject, string body, NotificationChannel channel = NotificationChannel.Email, string? eventId = null)
    {
        UserId = userId;
        Recipient = recipient;
        Subject = subject;
        Body = body;
        Channel = channel;
        Status = NotificationStatus.Pending;
        EventId = eventId;
    }

    public void MarkAsSent()
    {
        Status = NotificationStatus.Sent;
        SentAtUtc = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsFailed(string error)
    {
        Status = NotificationStatus.Failed;
        ErrorMessage = error;
        UpdatedAt = DateTime.UtcNow;
    }
}

public class NotificationPreference : BaseEntity
{
    public Guid UserId { get; set; }
    public bool EmailNotificationsEnabled { get; set; } = true;
    public bool FastingRemindersEnabled { get; set; } = true;
    public bool NutritionistAdviceAlertsEnabled { get; set; } = true;

    public NotificationPreference() { }

    public void UpdatePreferences(bool email, bool fasting, bool advice)
    {
        EmailNotificationsEnabled = email;
        FastingRemindersEnabled = fasting;
        NutritionistAdviceAlertsEnabled = advice;
        UpdatedAt = DateTime.UtcNow;
    }
}
