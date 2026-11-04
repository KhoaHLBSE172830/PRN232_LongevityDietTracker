using BuildingBlocks.Common.Exceptions;

namespace Notification.Domain.Exceptions;

public class NotificationNotFoundException : NotFoundException
{
    public NotificationNotFoundException(Guid id)
        : base($"Notification log with ID '{id}' was not found.")
    {
    }
}

public class NotificationPreferenceNotFoundException : NotFoundException
{
    public NotificationPreferenceNotFoundException(Guid userId)
        : base($"Notification preference for User ID '{userId}' was not found.")
    {
    }
}

public class NotificationDispatchException : BadRequestException
{
    public NotificationDispatchException(string reason)
        : base($"Failed to send notification: {reason}")
    {
    }
}

