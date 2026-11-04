using BuildingBlocks.Grpc.Contracts;
using BuildingBlocks.Messaging.Abstractions;
using BuildingBlocks.Messaging.Events;
using Consultation.Application.DTOs;
using Consultation.Application.Repositories;
using Consultation.Domain.Entities;
using Consultation.Domain.Enums;
using Consultation.Domain.Exceptions;

namespace Consultation.Application.Services;

public interface IConsultationService
{
    Task<ConsultationSessionDto> BookSessionAsync(BookConsultationDto dto);
    Task<List<ConsultationSessionDto>> GetNutritionistSessionsAsync(Guid nutritionistId);
    Task<AdviceNoteDto> SendAdviceAsync(SendAdviceDto dto);
    Task<UserHealthReviewDto> ReviewUserDietProgressAsync(Guid userId);
}

public class ConsultationService : IConsultationService
{
    private readonly IConsultationSessionRepository _sessionRepository;
    private readonly IAdviceNoteRepository _adviceRepository;
    private readonly BuildingBlocks.Common.Repositories.IUnitOfWork _unitOfWork;
    private readonly IDietFastingGrpcClientService _dietFastingGrpcClient;
    private readonly IEventBus? _eventBus;

    public ConsultationService(
        IConsultationSessionRepository sessionRepository,
        IAdviceNoteRepository adviceRepository,
        BuildingBlocks.Common.Repositories.IUnitOfWork unitOfWork,
        IDietFastingGrpcClientService dietFastingGrpcClient,
        IEventBus? eventBus = null)
    {
        _sessionRepository = sessionRepository;
        _adviceRepository = adviceRepository;
        _unitOfWork = unitOfWork;
        _dietFastingGrpcClient = dietFastingGrpcClient;
        _eventBus = eventBus;
    }

    public async Task<ConsultationSessionDto> BookSessionAsync(BookConsultationDto dto)
    {
        var session = new ConsultationSession
        {
            UserId = dto.UserId,
            NutritionistId = dto.NutritionistId,
            ScheduledAtUtc = dto.ScheduledAtUtc,
            Status = ConsultationStatus.Confirmed,
            Notes = dto.Notes
        };

        await _sessionRepository.CreateAsync(session);
        await _unitOfWork.SaveChangesAsync();

        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new ConsultationBookedIntegrationEvent(
                session.Id, session.UserId, session.NutritionistId, session.ScheduledAtUtc));
        }

        return new ConsultationSessionDto(
            session.Id, session.UserId, session.NutritionistId, session.ScheduledAtUtc,
            session.DurationMinutes, session.Status, session.Notes);
    }

    public async Task<List<ConsultationSessionDto>> GetNutritionistSessionsAsync(Guid nutritionistId)
    {
        var sessions = await _sessionRepository.GetByNutritionistIdAsync(nutritionistId);

        return sessions.Select(s => new ConsultationSessionDto(
            s.Id, s.UserId, s.NutritionistId, s.ScheduledAtUtc, s.DurationMinutes, s.Status, s.Notes)).ToList();
    }

    public async Task<AdviceNoteDto> SendAdviceAsync(SendAdviceDto dto)
    {
        var session = await _sessionRepository.FindByIdAsync(dto.ConsultationSessionId);
        if (session == null)
            throw new ConsultationNotFoundException(dto.ConsultationSessionId);

        var advice = new AdviceNote
        {
            ConsultationSessionId = dto.ConsultationSessionId,
            UserId = dto.UserId,
            NutritionistId = dto.NutritionistId,
            AdviceSummary = dto.AdviceSummary,
            DietaryRecommendations = dto.DietaryRecommendations,
            FastingRecommendations = dto.FastingRecommendations
        };

        session.Status = ConsultationStatus.Completed;
        session.UpdatedAt = DateTime.UtcNow;

        await _adviceRepository.CreateAsync(advice);
        await _sessionRepository.UpdateAsync(session);
        await _unitOfWork.SaveChangesAsync();

        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new AdviceSentIntegrationEvent(
                advice.Id, advice.ConsultationSessionId, advice.UserId, advice.NutritionistId, advice.AdviceSummary));
        }

        return new AdviceNoteDto(
            advice.Id, advice.ConsultationSessionId, advice.UserId, advice.NutritionistId,
            advice.AdviceSummary, advice.DietaryRecommendations, advice.FastingRecommendations, advice.CreatedAt ?? DateTime.UtcNow);
    }

    public async Task<UserHealthReviewDto> ReviewUserDietProgressAsync(Guid userId)
    {
        var fastingTask = _dietFastingGrpcClient.GetUserFastingSummaryAsync(userId);
        var nutritionTask = _dietFastingGrpcClient.GetUserNutritionSummaryAsync(userId, DateTime.UtcNow.AddDays(-30), DateTime.UtcNow);
        var fmdTask = _dietFastingGrpcClient.GetActiveFmdCycleAsync(userId);

        await Task.WhenAll(fastingTask, nutritionTask, fmdTask);

        return new UserHealthReviewDto(
            userId,
            await fastingTask,
            await nutritionTask,
            await fmdTask);
    }
}

