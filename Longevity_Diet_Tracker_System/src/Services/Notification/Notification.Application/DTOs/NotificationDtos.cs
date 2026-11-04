using Notification.Domain.Enums;

namespace Notification.Application.DTOs;

public record SendNotificationRequest(
    Guid UserId,
    string Recipient,
    string Subject,
    string Body,
    NotificationChannel Channel = NotificationChannel.Email);

public record NotificationLogResponse(
    Guid Id,
    Guid UserId,
    string Recipient,
    string Subject,
    string Body,
    NotificationChannel Channel,
    NotificationStatus Status,
    DateTime? SentAtUtc,
    string? ErrorMessage,
    DateTime? CreatedAt);

public record NotificationPreferenceDto(
    Guid UserId,
    bool EmailNotificationsEnabled,
    bool FastingRemindersEnabled,
    bool NutritionistAdviceAlertsEnabled,
    DateTime? UpdatedAt);

public record UpdatePreferenceRequest(
    bool EmailNotificationsEnabled,
    bool FastingRemindersEnabled,
    bool NutritionistAdviceAlertsEnabled);
