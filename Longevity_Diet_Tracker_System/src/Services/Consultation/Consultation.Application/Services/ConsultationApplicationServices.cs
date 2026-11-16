using BuildingBlocks.Grpc.Contracts;
using BuildingBlocks.Messaging.Abstractions;
using BuildingBlocks.Messaging.Events;
using Consultation.Application.DTOs;
using Consultation.Application.Repositories;
using Consultation.Domain.Entities;
using Consultation.Domain.Enums;
using Consultation.Domain.Exceptions;

namespace Consultation.Application.Services;

/// <summary>Người gọi API (lấy từ JWT ở tầng API): UserId và có phải Admin hay không.</summary>
public readonly record struct ConsultationCaller(Guid UserId, bool IsAdmin);

public interface IConsultationService
{
    Task<List<NutritionistProfileDto>> GetNutritionistsAsync();
    Task<NutritionistProfileDto> GetNutritionistByIdAsync(Guid id);
    Task<ConsultationSessionDto> BookSessionAsync(BookConsultationDto dto);
    Task<List<ConsultationSessionDto>> GetUserSessionsAsync(Guid userId);
    Task<NutritionistAvailabilityDto> GetAvailabilityAsync(Guid nutritionistId, DateOnly date);
    Task<ConsultationSessionDto> ConfirmSessionAsync(Guid sessionId, ConsultationCaller caller);
    Task<ConsultationSessionDto> CancelSessionAsync(Guid sessionId, ConsultationCaller caller, string? reason);
    Task<List<ConsultationSessionDto>> GetNutritionistSessionsAsync(Guid nutritionistId, ConsultationCaller caller);
    Task<AdviceNoteDto> SendAdviceAsync(SendAdviceDto dto, ConsultationCaller caller);
    Task<List<AdviceNoteDto>> GetUserAdvicesAsync(Guid userId);
    Task<UserHealthReviewDto> ReviewUserDietProgressAsync(ConsultationCaller caller, Guid userId);
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
            p.Id, p.UserId, p.FullName, p.Certification, p.Specialization, p.Bio, p.IsVerified, p.TagList.ToList(), p.AvatarUrl)).ToList();
    }

    public async Task<NutritionistProfileDto> GetNutritionistByIdAsync(Guid id)
    {
        var profile = await _nutritionistRepository.FindByIdAsync(id);
        if (profile == null)
            throw new NutritionistNotFoundException(id);

        return new NutritionistProfileDto(
            profile.Id, profile.UserId, profile.FullName, profile.Certification, profile.Specialization, profile.Bio, profile.IsVerified, profile.TagList.ToList(), profile.AvatarUrl);
    }

    public async Task<ConsultationSessionDto> BookSessionAsync(BookConsultationDto dto)
    {
        var nutritionist = await _nutritionistRepository.FindByIdAsync(dto.NutritionistId);
        if (nutritionist == null)
            throw new NutritionistNotFoundException(dto.NutritionistId);

        if (!nutritionist.IsVerified)
            throw new ConsultationBadRequestException("Chuyên gia dinh dưỡng này chưa được xác minh hoặc không sẵn sàng nhận lịch tư vấn.");

        // ConsultationSession.Schedule enforces ScheduledAtUtc in future & UTC format
        var session = ConsultationSession.Schedule(dto.UserId, dto.NutritionistId, dto.ScheduledAtUtc, 45, dto.Notes, dto.UserEmail);

        // Không cho đặt trùng khung giờ đã có lịch (Pending/Confirmed) của cùng bác sĩ.
        var existing = await _sessionRepository.GetByNutritionistIdAsync(dto.NutritionistId);
        if (existing.Any(x => x.BlocksSlot && x.ScheduledAtUtc < session.EndAtUtc && session.ScheduledAtUtc < x.EndAtUtc))
            throw new ConsultationConflictException("Khung giờ này đã có người đặt. Vui lòng chọn khung giờ khác.");

        await _sessionRepository.CreateAsync(session);
        await _unitOfWork.SaveChangesAsync();

        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new ConsultationBookedIntegrationEvent(
                session.Id, session.UserId, session.NutritionistId, session.ScheduledAtUtc, session.UserEmail, nutritionist.UserId));
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

    // Giờ làm việc cố định theo giờ Việt Nam (UTC+7): 08–11 và 13–16, mỗi giờ một buổi 45 phút.
    private static readonly int[] WorkingStartHoursVn = { 8, 9, 10, 11, 13, 14, 15, 16 };
    private static readonly TimeSpan VnOffset = TimeSpan.FromHours(7);

    public async Task<NutritionistAvailabilityDto> GetAvailabilityAsync(Guid nutritionistId, DateOnly date)
    {
        var nutritionist = await _nutritionistRepository.FindByIdAsync(nutritionistId)
            ?? throw new NutritionistNotFoundException(nutritionistId);
        if (!nutritionist.IsVerified)
            throw new ConsultationBadRequestException("Chuyên gia dinh dưỡng này chưa được xác minh hoặc không sẵn sàng nhận lịch tư vấn.");

        var booked = (await _sessionRepository.GetByNutritionistIdAsync(nutritionistId)).Where(x => x.BlocksSlot).ToList();
        var now = DateTime.UtcNow;
        var slots = new List<AvailabilitySlotDto>();
        foreach (var h in WorkingStartHoursVn)
        {
            var startUtc = DateTime.SpecifyKind(date.ToDateTime(new TimeOnly(h, 0)) - VnOffset, DateTimeKind.Utc);
            var endUtc = startUtc.AddMinutes(45);
            var free = startUtc > now && !booked.Any(x => x.ScheduledAtUtc < endUtc && startUtc < x.EndAtUtc);
            slots.Add(new AvailabilitySlotDto(startUtc, endUtc, free));
        }
        return new NutritionistAvailabilityDto(nutritionistId, date, slots);
    }

    private ConsultationSessionDto ToDto(ConsultationSession s, string? nutritionistName) => new(
        s.Id, s.UserId, s.NutritionistId, s.ScheduledAtUtc, s.DurationMinutes, s.Status, s.Notes, nutritionistName);

    /// <summary>Bác sĩ của buổi tư vấn (hoặc Admin) xác nhận lịch đang chờ.</summary>
    public async Task<ConsultationSessionDto> ConfirmSessionAsync(Guid sessionId, ConsultationCaller caller)
    {
        var session = await _sessionRepository.FindByIdAsync(sessionId) ?? throw new ConsultationNotFoundException(sessionId);
        var own = await RequireOwnProfileUnlessAdminAsync(caller);
        if (own != null && own.Id != session.NutritionistId)
            throw new ConsultationForbiddenException("Bạn chỉ được xác nhận lịch hẹn của chính mình.");

        session.Confirm();
        await _sessionRepository.UpdateAsync(session);
        await _unitOfWork.SaveChangesAsync();
        return ToDto(session, null);
    }

    /// <summary>Hội viên đặt lịch, bác sĩ phụ trách hoặc Admin được hủy lịch đang chờ/đã xác nhận.</summary>
    public async Task<ConsultationSessionDto> CancelSessionAsync(Guid sessionId, ConsultationCaller caller, string? reason)
    {
        var session = await _sessionRepository.FindByIdAsync(sessionId) ?? throw new ConsultationNotFoundException(sessionId);

        if (!caller.IsAdmin && session.UserId != caller.UserId)
        {
            var own = await _nutritionistRepository.GetByUserIdAsync(caller.UserId);
            if (own == null || own.Id != session.NutritionistId)
                throw new ConsultationForbiddenException("Bạn không có quyền hủy lịch hẹn này.");
        }

        session.Cancel(reason);
        await _sessionRepository.UpdateAsync(session);
        await _unitOfWork.SaveChangesAsync();
        return ToDto(session, null);
    }

    /// <summary>
    /// Bác sĩ (không phải Admin) chỉ được thao tác với hồ sơ của chính mình. Tài khoản có role Nutritionist nhưng chưa gắn
    /// với hồ sơ bác sĩ nào bị từ chối (không "fail-open"). Trả về hồ sơ của người gọi (null nếu là Admin).
    /// </summary>
    private async Task<NutritionistProfile?> RequireOwnProfileUnlessAdminAsync(ConsultationCaller caller)
    {
        if (caller.IsAdmin)
            return null;

        var profile = await _nutritionistRepository.GetByUserIdAsync(caller.UserId);
        if (profile == null)
            throw new ConsultationForbiddenException("Tài khoản của bạn chưa được gắn với hồ sơ bác sĩ dinh dưỡng nào.");

        return profile;
    }

    public async Task<List<ConsultationSessionDto>> GetNutritionistSessionsAsync(Guid nutritionistId, ConsultationCaller caller)
    {
        // N3: bác sĩ chỉ xem được danh sách bệnh nhân của chính mình
        var profile = await RequireOwnProfileUnlessAdminAsync(caller);
        if (profile != null && profile.Id != nutritionistId)
            throw new ConsultationForbiddenException("Bạn chỉ được xem lịch hẹn của chính mình.");

        var sessions = await _sessionRepository.GetByNutritionistIdAsync(nutritionistId);
        return sessions.Select(s => new ConsultationSessionDto(
            s.Id, s.UserId, s.NutritionistId, s.ScheduledAtUtc, s.DurationMinutes, s.Status, s.Notes, s.Nutritionist?.FullName)).ToList();
    }

    public async Task<AdviceNoteDto> SendAdviceAsync(SendAdviceDto dto, ConsultationCaller caller)
    {
        var session = await _sessionRepository.FindByIdAsync(dto.ConsultationSessionId);
        if (session == null)
            throw new ConsultationNotFoundException(dto.ConsultationSessionId);

        // N2: kiểm tra quyền TRƯỚC mọi kiểm tra trạng thái (không để lộ thông tin phiên cho người không có quyền).
        // Không phải Admin thì bắt buộc phải có hồ sơ bác sĩ và hồ sơ đó phải là bác sĩ của phiên.
        var callerProfile = await RequireOwnProfileUnlessAdminAsync(caller);
        if (callerProfile != null && callerProfile.Id != session.NutritionistId)
            throw new ConsultationForbiddenException("Bạn không có quyền kê đơn cho phiên tư vấn của bác sĩ khác.");

        // A6: Check if session already has advice or is completed -> 409 Conflict
        var existingAdvice = await _adviceRepository.GetBySessionIdAsync(session.Id);
        if (existingAdvice != null || session.Status == ConsultationStatus.Completed)
        {
            throw new ConsultationConflictException("Phiên tư vấn này đã có phiếu lời khuyên hoặc đã hoàn tất.");
        }

        if (session.Status == ConsultationStatus.Cancelled)
        {
            throw new ConsultationBadRequestException("Không thể gửi phiếu lời khuyên cho phiên tư vấn đã bị hủy.");
        }

        // A6: Validate UserId / NutritionistId if passed in payload
        if (dto.UserId.HasValue && dto.UserId.Value != Guid.Empty && dto.UserId.Value != session.UserId)
        {
            throw new ConsultationBadRequestException("UserId trong yêu cầu không khớp với phiên tư vấn.");
        }

        if (dto.NutritionistId.HasValue && dto.NutritionistId.Value != Guid.Empty && dto.NutritionistId.Value != session.NutritionistId)
        {
            throw new ConsultationForbiddenException("Bác sĩ không có quyền kê đơn cho phiên tư vấn của bác sĩ khác.");
        }

        // A5: ALWAYS assign the real UserId and NutritionistId from the session itself!
        var advice = AdviceNote.Create(
            session.Id,
            session.UserId,
            session.NutritionistId,
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
                advice.Id, advice.ConsultationSessionId, advice.UserId, advice.NutritionistId, advice.AdviceSummary, session.UserEmail));
        }

        var nutritionist = await _nutritionistRepository.FindByIdAsync(session.NutritionistId);

        return new AdviceNoteDto(
            advice.Id, advice.ConsultationSessionId, advice.UserId, advice.NutritionistId,
            advice.AdviceSummary, advice.DietaryRecommendations, advice.FastingRecommendations, advice.CreatedAt ?? DateTime.UtcNow,
            nutritionist?.FullName);
    }

    public async Task<List<AdviceNoteDto>> GetUserAdvicesAsync(Guid userId)
    {
        var advices = await _adviceRepository.GetByUserIdAsync(userId);
        return advices.Select(a => new AdviceNoteDto(
            a.Id, a.ConsultationSessionId, a.UserId, a.NutritionistId,
            a.AdviceSummary, a.DietaryRecommendations, a.FastingRecommendations, a.CreatedAt ?? DateTime.UtcNow,
            a.ConsultationSession?.Nutritionist?.FullName)).ToList();
    }

    public async Task<UserHealthReviewDto> ReviewUserDietProgressAsync(ConsultationCaller caller, Guid userId)
    {
        // AGENT.md 4.3 (N4): bác sĩ chỉ xem dữ liệu của hội viên khi có lịch tư vấn hợp lệ GIỮA HAI BÊN.
        // Admin chỉ cần hội viên có lịch tư vấn hợp lệ với bất kỳ bác sĩ nào.
        var callerProfile = await RequireOwnProfileUnlessAdminAsync(caller);

        var userSessions = await _sessionRepository.GetByUserIdAsync(userId);
        var hasValidSession = userSessions.Any(s =>
            (callerProfile == null || s.NutritionistId == callerProfile.Id) &&
            (s.Status == ConsultationStatus.Pending ||
             s.Status == ConsultationStatus.Confirmed ||
             s.Status == ConsultationStatus.Completed));

        if (!hasValidSession)
        {
            throw new ConsultationForbiddenException("Chuyên gia chỉ được phép xem dữ liệu sức khỏe của hội viên khi có lịch tư vấn đã được đặt với chính mình.");
        }

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
