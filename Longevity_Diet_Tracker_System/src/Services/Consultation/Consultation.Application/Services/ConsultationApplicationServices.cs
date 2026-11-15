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
    Task<List<NutritionistProfileDto>> GetNutritionistsAsync();
    Task<ConsultationSessionDto> BookSessionAsync(BookConsultationDto dto);
    Task<List<ConsultationSessionDto>> GetUserSessionsAsync(Guid userId);
    Task<List<ConsultationSessionDto>> GetNutritionistSessionsAsync(Guid nutritionistId);
    Task<AdviceNoteDto> SendAdviceAsync(SendAdviceDto dto);
    Task<List<AdviceNoteDto>> GetUserAdvicesAsync(Guid userId);
    Task<UserHealthReviewDto> ReviewUserDietProgressAsync(Guid userId);
}

public class ConsultationService : IConsultationService
{
    private readonly IConsultationSessionRepository _sessionRepository;
    private readonly INutritionistProfileRepository _nutritionistRepository;
    private readonly IAdviceNoteRepository _adviceRepository;
    private readonly BuildingBlocks.Common.Repositories.IUnitOfWork _unitOfWork;
    private readonly IDietFastingGrpcClientService _dietFastingGrpcClient;
    private readonly IEventBus? _eventBus;

    public ConsultationService(
        IConsultationSessionRepository sessionRepository,
        INutritionistProfileRepository nutritionistRepository,
        IAdviceNoteRepository adviceRepository,
        BuildingBlocks.Common.Repositories.IUnitOfWork unitOfWork,
        IDietFastingGrpcClientService dietFastingGrpcClient,
        IEventBus? eventBus = null)
    {
        _sessionRepository = sessionRepository;
        _nutritionistRepository = nutritionistRepository;
        _adviceRepository = adviceRepository;
        _unitOfWork = unitOfWork;
        _dietFastingGrpcClient = dietFastingGrpcClient;
        _eventBus = eventBus;
    }

    public async Task<List<NutritionistProfileDto>> GetNutritionistsAsync()
    {
        var profiles = await _nutritionistRepository.GetVerifiedNutritionistsAsync();
        return profiles.Select(p => new NutritionistProfileDto(
            p.Id, p.UserId, p.FullName, p.Certification, p.Specialization, p.Bio, p.IsVerified)).ToList();
    }

    public async Task<ConsultationSessionDto> BookSessionAsync(BookConsultationDto dto)
    {
        var nutritionist = await _nutritionistRepository.FindByIdAsync(dto.NutritionistId);
        if (nutritionist == null)
            throw new NutritionistNotFoundException(dto.NutritionistId);

        var session = ConsultationSession.Schedule(dto.UserId, dto.NutritionistId, dto.ScheduledAtUtc, 45, dto.Notes);

        await _sessionRepository.CreateAsync(session);
        await _unitOfWork.SaveChangesAsync();

        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new ConsultationBookedIntegrationEvent(
                session.Id, session.UserId, session.NutritionistId, session.ScheduledAtUtc));
        }

        return new ConsultationSessionDto(
            session.Id, session.UserId, session.NutritionistId, session.ScheduledAtUtc,
            session.DurationMinutes, session.Status, session.Notes, nutritionist.FullName);
    }

    public async Task<List<ConsultationSessionDto>> GetUserSessionsAsync(Guid userId)
    {
        var sessions = await _sessionRepository.GetByUserIdAsync(userId);
        return sessions.Select(s => new ConsultationSessionDto(
            s.Id, s.UserId, s.NutritionistId, s.ScheduledAtUtc, s.DurationMinutes, s.Status, s.Notes, s.Nutritionist?.FullName)).ToList();
    }

    public async Task<List<ConsultationSessionDto>> GetNutritionistSessionsAsync(Guid nutritionistId)
    {
        var sessions = await _sessionRepository.GetByNutritionistIdAsync(nutritionistId);
        return sessions.Select(s => new ConsultationSessionDto(
            s.Id, s.UserId, s.NutritionistId, s.ScheduledAtUtc, s.DurationMinutes, s.Status, s.Notes, s.Nutritionist?.FullName)).ToList();
    }

    public async Task<AdviceNoteDto> SendAdviceAsync(SendAdviceDto dto)
    {
        var session = await _sessionRepository.FindByIdAsync(dto.ConsultationSessionId);
        if (session == null)
            throw new ConsultationNotFoundException(dto.ConsultationSessionId);

        var advice = new AdviceNote(
            dto.ConsultationSessionId,
            dto.UserId,
            dto.NutritionistId,
            dto.AdviceSummary,
            dto.DietaryRecommendations,
            dto.FastingRecommendations);

        session.AttachAdvice(advice);

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

    public async Task<List<AdviceNoteDto>> GetUserAdvicesAsync(Guid userId)
    {
        var advices = await _adviceRepository.GetByUserIdAsync(userId);
        return advices.Select(a => new AdviceNoteDto(
            a.Id, a.ConsultationSessionId, a.UserId, a.NutritionistId,
            a.AdviceSummary, a.DietaryRecommendations, a.FastingRecommendations, a.CreatedAt ?? DateTime.UtcNow)).ToList();
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


