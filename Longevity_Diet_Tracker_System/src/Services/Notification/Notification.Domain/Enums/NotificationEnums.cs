namespace Notification.Domain.Enums;

public enum NotificationStatus
{
    Pending = 1,
    Sent = 2,
    Failed = 3
}

public enum NotificationChannel
{
    Email = 1,
    InApp = 2,
    Push = 3
}

