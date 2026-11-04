using BuildingBlocks.Messaging.Abstractions;

namespace BuildingBlocks.Messaging.Events;

// Published by Identity Service
public record UserRegisteredIntegrationEvent(
    Guid UserId,
    string Email,
    string FullName,
    string Role) : IntegrationEvent;

// Published by Diet & Fasting Service
public record MealLoggedIntegrationEvent(
    Guid MealLogId,
    Guid UserId,
    string MealType,
    double Calories,
    DateTime LoggedAt) : IntegrationEvent;

public record FastingStartedIntegrationEvent(
    Guid FastingSessionId,
    Guid UserId,
    string FastingType,
    DateTime StartTime,
    DateTime TargetEndTime) : IntegrationEvent;

public record FastingCompletedIntegrationEvent(
    Guid FastingSessionId,
    Guid UserId,
    string FastingType,
    DateTime StartTime,
    DateTime ActualEndTime,
    double TotalHours) : IntegrationEvent;

public record FmdCycleAlertIntegrationEvent(
    Guid FmdCycleId,
    Guid UserId,
    int DayNumber,
    string Message) : IntegrationEvent;

// Published by Consultation Service
public record AdviceSentIntegrationEvent(
    Guid AdviceId,
    Guid ConsultationSessionId,
    Guid UserId,
    Guid NutritionistId,
    string AdviceSummary) : IntegrationEvent;

public record ConsultationBookedIntegrationEvent(
    Guid ConsultationId,
    Guid UserId,
    Guid NutritionistId,
    DateTime ScheduledAt) : IntegrationEvent;

// Published by Job Service
public record FastingScheduleTriggerIntegrationEvent(
    DateTime TriggeredAtUtc,
    string JobName) : IntegrationEvent;

// Consumed by Notification Service to send emails via SMTP
public record SendEmailNotificationIntegrationEvent(
    Guid UserId,
    string RecipientEmail,
    string Subject,
    string BodyHtml) : IntegrationEvent;

