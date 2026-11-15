using Notification.Application.DTOs;

namespace Notification.Application.Services;

public interface INotificationService
{
    Task<NotificationLogResponse> SendAndLogNotificationAsync(SendNotificationRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<NotificationLogResponse>> GetUserNotificationsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<NotificationLogResponse> MarkAsReadAsync(Guid notificationId, Guid requesterUserId, bool isAdmin, CancellationToken cancellationToken = default);
    Task<int> MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<NotificationPreferenceDto> GetUserPreferenceAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<NotificationPreferenceDto> UpdateUserPreferenceAsync(Guid userId, UpdatePreferenceRequest request, CancellationToken cancellationToken = default);
}

