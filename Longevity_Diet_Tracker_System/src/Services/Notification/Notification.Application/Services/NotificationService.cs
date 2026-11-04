using BuildingBlocks.Common.Repositories;
using Microsoft.Extensions.Logging;
using Notification.Application.DTOs;
using Notification.Application.Repositories;
using Notification.Domain.Entities;
using Notification.Domain.Enums;
using Notification.Domain.Exceptions;

namespace Notification.Application.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationLogRepository _logRepository;
    private readonly INotificationPreferenceRepository _preferenceRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEmailService _emailService;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        INotificationLogRepository logRepository,
        INotificationPreferenceRepository preferenceRepository,
        IUnitOfWork unitOfWork,
        IEmailService emailService,
        ILogger<NotificationService> logger)
    {
        _logRepository = logRepository;
        _preferenceRepository = preferenceRepository;
        _unitOfWork = unitOfWork;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<NotificationLogResponse> SendAndLogNotificationAsync(SendNotificationRequest request, CancellationToken cancellationToken = default)
    {
        var log = new NotificationLog
        {
            UserId = request.UserId,
            Recipient = request.Recipient,
            Subject = request.Subject,
            Body = request.Body,
            Channel = request.Channel,
            Status = NotificationStatus.Pending
        };

        if (request.Channel == NotificationChannel.Email)
        {
            try
            {
                await _emailService.SendEmailAsync(request.Recipient, request.Subject, request.Body, cancellationToken);
                log.Status = NotificationStatus.Sent;
                log.SentAtUtc = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {Recipient}", request.Recipient);
                log.Status = NotificationStatus.Failed;
                log.ErrorMessage = ex.Message;
            }
        }

        await _logRepository.CreateAsync(log);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToResponse(log);
    }

    public async Task<IReadOnlyList<NotificationLogResponse>> GetUserNotificationsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var logs = await _logRepository.GetLogsByUserIdAsync(userId, 50, cancellationToken);
        return logs.Select(MapToResponse).ToList();
    }

    public async Task<NotificationPreferenceDto> GetUserPreferenceAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var pref = await _preferenceRepository.GetByUserIdAsync(userId, cancellationToken);
        if (pref == null)
        {
            pref = new NotificationPreference
            {
                UserId = userId,
                EmailNotificationsEnabled = true,
                FastingRemindersEnabled = true,
                NutritionistAdviceAlertsEnabled = true
            };
            await _preferenceRepository.CreateAsync(pref);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return new NotificationPreferenceDto(
            pref.UserId,
            pref.EmailNotificationsEnabled,
            pref.FastingRemindersEnabled,
            pref.NutritionistAdviceAlertsEnabled,
            pref.UpdatedAt ?? pref.CreatedAt);
    }

    public async Task<NotificationPreferenceDto> UpdateUserPreferenceAsync(Guid userId, UpdatePreferenceRequest request, CancellationToken cancellationToken = default)
    {
        var pref = await _preferenceRepository.GetByUserIdAsync(userId, cancellationToken);
        if (pref == null)
        {
            pref = new NotificationPreference
            {
                UserId = userId,
                EmailNotificationsEnabled = request.EmailNotificationsEnabled,
                FastingRemindersEnabled = request.FastingRemindersEnabled,
                NutritionistAdviceAlertsEnabled = request.NutritionistAdviceAlertsEnabled
            };
            await _preferenceRepository.CreateAsync(pref);
        }
        else
        {
            pref.EmailNotificationsEnabled = request.EmailNotificationsEnabled;
            pref.FastingRemindersEnabled = request.FastingRemindersEnabled;
            pref.NutritionistAdviceAlertsEnabled = request.NutritionistAdviceAlertsEnabled;
            pref.UpdatedAt = DateTime.UtcNow;
            await _preferenceRepository.UpdateAsync(pref);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new NotificationPreferenceDto(
            pref.UserId,
            pref.EmailNotificationsEnabled,
            pref.FastingRemindersEnabled,
            pref.NutritionistAdviceAlertsEnabled,
            pref.UpdatedAt);
    }

    private static NotificationLogResponse MapToResponse(NotificationLog log)
    {
        return new NotificationLogResponse(
            log.Id,
            log.UserId,
            log.Recipient,
            log.Subject,
            log.Body,
            log.Channel,
            log.Status,
            log.SentAtUtc,
            log.ErrorMessage,
            log.CreatedAt);
    }
}
