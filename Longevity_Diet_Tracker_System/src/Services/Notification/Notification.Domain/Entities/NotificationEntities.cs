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
}

public class NotificationPreference : BaseEntity
{
    public Guid UserId { get; set; }
    public bool EmailNotificationsEnabled { get; set; } = true;
    public bool FastingRemindersEnabled { get; set; } = true;
    public bool NutritionistAdviceAlertsEnabled { get; set; } = true;
}
