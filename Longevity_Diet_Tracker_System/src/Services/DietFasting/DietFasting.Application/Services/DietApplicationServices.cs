using BuildingBlocks.Common.Repositories;
using BuildingBlocks.Messaging.Abstractions;
using BuildingBlocks.Messaging.Events;
using DietFasting.Application.DTOs;
using DietFasting.Application.Repositories;
using DietFasting.Domain.Entities;
using DietFasting.Domain.Enums;
using DietFasting.Domain.Exceptions;

namespace DietFasting.Application.Services;

public class MealService : IMealService
{
    private readonly IMealLogRepository _mealRepository;
    private readonly IFmdCycleRepository _fmdRepository;
    private readonly IFmdRuleRepository _fmdRuleRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEventBus? _eventBus;

    public MealService(
        IMealLogRepository mealRepository,
        IFmdCycleRepository fmdRepository,
        IFmdRuleRepository fmdRuleRepository,
        IUnitOfWork unitOfWork,
        IEventBus? eventBus = null)
    {
        _mealRepository = mealRepository;
        _fmdRepository = fmdRepository;
        _fmdRuleRepository = fmdRuleRepository;
        _unitOfWork = unitOfWork;
        _eventBus = eventBus;
    }

    public async Task<MealLogResponseDto> LogMealAsync(CreateMealLogDto dto)
    {
        var mealLog = new MealLog(dto.UserId, dto.MealType, dto.LoggedAt, dto.IsHaraHachiBuCompliant, dto.SatietyPercentage)
        {
            Notes = dto.Notes
        };

        foreach (var item in dto.FoodItems)
        {
            mealLog.AddFoodItem(new MealFoodItem
            {
                ExternalFoodId = item.ExternalFoodId,
                FoodName = item.FoodName,
                ServingSize = item.ServingSize,
                ServingUnit = item.ServingUnit,
                Calories = item.Calories,
                ProteinGrams = item.ProteinGrams,
                CarbsGrams = item.CarbsGrams,
                FatGrams = item.FatGrams,
                FiberGrams = item.FiberGrams
            });
        }

        // AGENT.md Invariant 4.1: Fasting Mimicking Diet (FMD) Threshold Check
        var activeFmd = await _fmdRepository.GetActiveCycleAsync(dto.UserId);
        if (activeFmd != null)
        {
            var dayCaloriesAlready = await _mealRepository.GetUserTotalCaloriesForDateAsync(dto.UserId, dto.LoggedAt.Date);
            var projectedTotal = dayCaloriesAlready + mealLog.TotalCalories;

            var rule = await _fmdRuleRepository.GetRuleByDayAsync(activeFmd.CurrentDay);
            var thresholdLimit = rule?.MaxCalories ?? (activeFmd.CurrentDay == 1 ? 1100 : 725);

            if (projectedTotal > thresholdLimit)
            {
                var reason = $"Day {activeFmd.CurrentDay} FMD Calorie Limit Exceeded! Projected: {projectedTotal:F0} kcal vs Threshold: {thresholdLimit:F0} kcal.";
                mealLog.MarkThresholdExceeded(reason);

                if (_eventBus != null)
                {
                    await _eventBus.PublishAsync(new FmdCycleAlertIntegrationEvent(
                        activeFmd.Id, activeFmd.UserId, activeFmd.CurrentDay, reason));
                }
            }
        }

        await _mealRepository.CreateAsync(mealLog);
        await _unitOfWork.SaveChangesAsync();

        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new MealLoggedIntegrationEvent(
                mealLog.Id, mealLog.UserId, mealLog.MealType.ToString(), mealLog.TotalCalories, mealLog.LoggedAt));
        }

        return MapToDto(mealLog);
    }

    public async Task<List<MealLogResponseDto>> GetUserMealsAsync(Guid userId, DateTime date)
    {
        var logs = await _mealRepository.GetUserMealsByDateAsync(userId, date);
        return logs.Select(MapToDto).ToList();
    }

    private static MealLogResponseDto MapToDto(MealLog m)
    {
        return new MealLogResponseDto(
            m.Id, m.UserId, m.MealType, m.LoggedAt,
            m.TotalCalories, m.TotalProteinGrams, m.TotalCarbsGrams, m.TotalFatGrams, m.TotalFiberGrams,
            m.IsHaraHachiBuCompliant, m.SatietyPercentage,
            m.ExceededThreshold, m.ThresholdViolationNotes,
            m.Notes,
            m.FoodItems.Select(f => new FoodItemDto(
                f.ExternalFoodId, f.FoodName, f.ServingSize, f.ServingUnit,
                f.Calories, f.ProteinGrams, f.CarbsGrams, f.FatGrams, f.FiberGrams)).ToList());
    }
}

public class FastingService : IFastingService
{
    private readonly IFastingSessionRepository _fastingRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEventBus? _eventBus;

    public FastingService(IFastingSessionRepository fastingRepository, IUnitOfWork unitOfWork, IEventBus? eventBus = null)
    {
        _fastingRepository = fastingRepository;
        _unitOfWork = unitOfWork;
        _eventBus = eventBus;
    }

    public async Task<FastingSessionResponseDto> StartFastingAsync(StartFastingRequestDto dto, string? notificationEmail = null, CancellationToken cancellationToken = default)
    {
        // Cheap validation first (no DB round-trip for bad input).
        var now = DateTime.UtcNow;
        var startTime = dto.StartTimeUtc == default ? now : NormalizeToUtc(dto.StartTimeUtc);
        if (startTime > now.AddMinutes(5))
            throw new InvalidFastingSessionException("StartTimeUtc cannot be in the future.");

        var session = FastingSession.Create(dto.UserId, dto.FastingType, startTime, dto.DurationHours, notificationEmail);

        // AGENT.md Invariant 4.1: at most ONE session in "InProgress" per user.
        var active = await _fastingRepository.GetActiveSessionAsync(dto.UserId);
        if (active != null)
            throw new ActiveFastingSessionAlreadyExistsException(dto.UserId);

        await _fastingRepository.CreateAsync(session);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new FastingStartedIntegrationEvent(
                session.Id, session.UserId, session.FastingType.ToString(), session.StartTimeUtc, session.TargetEndTimeUtc),
                cancellationToken);
        }

        return MapToDto(session);
    }

    public async Task<FastingSessionResponseDto> EndFastingAsync(Guid sessionId, Guid requesterUserId, string? moodNotes = null, CancellationToken cancellationToken = default)
    {
        var session = await GetOwnedSessionAsync(sessionId, requesterUserId);

        session.Complete(DateTime.UtcNow, moodNotes);

        await _fastingRepository.UpdateAsync(session);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new FastingCompletedIntegrationEvent(
                session.Id, session.UserId, session.FastingType.ToString(),
                session.StartTimeUtc, session.ActualEndTimeUtc!.Value, session.ActualFastedHours ?? 0),
                cancellationToken);
        }

        return MapToDto(session);
    }

    public async Task<FastingSessionResponseDto> CancelFastingAsync(Guid sessionId, Guid requesterUserId, string? reason = null, CancellationToken cancellationToken = default)
    {
        var session = await GetOwnedSessionAsync(sessionId, requesterUserId);

        session.Cancel(reason);

        await _fastingRepository.UpdateAsync(session);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(session);
    }

    public async Task<FastingSessionResponseDto?> GetActiveFastingSessionAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var session = await _fastingRepository.GetActiveSessionAsync(userId);
        return session == null ? null : MapToDto(session);
    }

    private async Task<FastingSession> GetOwnedSessionAsync(Guid sessionId, Guid requesterUserId)
    {
        var session = await _fastingRepository.FindByIdAsync(sessionId)
            ?? throw new FastingSessionNotFoundException(sessionId);

        // AGENT.md 4.3: a User may only touch their own data.
        if (session.UserId != requesterUserId)
            throw new FastingSessionAccessDeniedException();

        return session;
    }

    // Npgsql only accepts DateTime with Kind=Utc for "timestamp with time zone".
    private static DateTime NormalizeToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };

    private static FastingSessionResponseDto MapToDto(FastingSession s) => new(
        s.Id, s.UserId, s.FastingType, s.StartTimeUtc, s.TargetEndTimeUtc,
        s.ActualEndTimeUtc, s.Status, s.ActualFastedHours, s.MoodNotes);
}

public class FmdService : IFmdService
{
    private readonly IFmdCycleRepository _fmdRepository;
    private readonly IFmdRuleRepository _fmdRuleRepository;
    private readonly IUnitOfWork _unitOfWork;

    public FmdService(IFmdCycleRepository fmdRepository, IFmdRuleRepository fmdRuleRepository, IUnitOfWork unitOfWork)
    {
        _fmdRepository = fmdRepository;
        _fmdRuleRepository = fmdRuleRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<FmdCycleResponseDto> StartCycleAsync(StartFmdCycleDto dto)
    {
        var active = await _fmdRepository.GetActiveCycleAsync(dto.UserId);
        if (active != null)
            throw new ActiveFmdCycleAlreadyExistsException(dto.UserId);

        var startDateUtc = dto.StartDate == default
            ? DateTime.UtcNow
            : dto.StartDate.Kind switch
            {
                DateTimeKind.Utc => dto.StartDate,
                DateTimeKind.Local => dto.StartDate.ToUniversalTime(),
                _ => DateTime.SpecifyKind(dto.StartDate, DateTimeKind.Utc)
            };

        var count = await _fmdRepository.GetCycleCountAsync(dto.UserId);
        var cycle = FmdCycle.Create(dto.UserId, count + 1, startDateUtc);

        await _fmdRepository.CreateAsync(cycle);
        await _unitOfWork.SaveChangesAsync();

        var rule = await _fmdRuleRepository.GetRuleByDayAsync(1);
        var targetCal = rule?.MaxCalories ?? 1100;

        return new FmdCycleResponseDto(
            cycle.Id, cycle.UserId, cycle.CycleNumber, cycle.StartDate, cycle.EndDate, cycle.CurrentDay, cycle.Status, targetCal);
    }

    public async Task<FmdCycleResponseDto?> GetActiveCycleAsync(Guid userId)
    {
        var cycle = await _fmdRepository.GetActiveCycleAsync(userId);
        if (cycle == null) return null;

        var rule = await _fmdRuleRepository.GetRuleByDayAsync(cycle.CurrentDay);
        var targetCal = rule?.MaxCalories ?? (cycle.CurrentDay == 1 ? 1100 : 725);

        return new FmdCycleResponseDto(
            cycle.Id, cycle.UserId, cycle.CycleNumber, cycle.StartDate, cycle.EndDate, cycle.CurrentDay, cycle.Status, targetCal);
    }

    public async Task<int> AdvanceActiveCyclesAsync(CancellationToken cancellationToken = default)
    {
        var activeCycles = await _fmdRepository.GetAllActiveCyclesAsync();
        if (activeCycles.Count == 0) return 0;

        foreach (var cycle in activeCycles)
        {
            cycle.AdvanceDay();
            await _fmdRepository.UpdateAsync(cycle);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return activeCycles.Count;
    }
}

public class FmdRuleService : IFmdRuleService
{
    private readonly IFmdRuleRepository _ruleRepository;
    private readonly IUnitOfWork _unitOfWork;

    public FmdRuleService(IFmdRuleRepository ruleRepository, IUnitOfWork unitOfWork)
    {
        _ruleRepository = ruleRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<List<FmdRuleDto>> GetAllRulesAsync()
    {
        var rules = await _ruleRepository.GetAllRulesAsync();
        if (rules.Count == 0)
        {
            var defaultRules = new List<FmdRule>
            {
                new(1, 1100, 11, 46, 43, "Ngày 1 (Khởi động): Chuyển đổi năng lượng tế bào (1100 kcal)"),
                new(2, 725, 9, 44, 47, "Ngày 2: Đốt mỡ sâu & Kích hoạt tự thực bào Autophagy (725 kcal)"),
                new(3, 725, 9, 44, 47, "Ngày 3: Thanh lọc tế bào lão hóa & Giảm chỉ số viêm (725 kcal)"),
                new(4, 725, 9, 44, 47, "Ngày 4: Tái tạo hệ miễn dịch & Trẻ hóa sinh học (725 kcal)"),
                new(5, 725, 9, 44, 47, "Ngày 5: Hoàn tất chu kỳ & Phục hồi tế bào gốc (725 kcal)")
            };
            await _ruleRepository.CreateRangeAsync(defaultRules);
            await _unitOfWork.SaveChangesAsync();
            rules = defaultRules;
        }

        return rules.Select(r => new FmdRuleDto(
            r.Id, r.DayNumber, r.MaxCalories, r.TargetProteinPercent, r.TargetFatPercent, r.TargetCarbPercent, r.Description)).ToList();
    }

    public async Task<FmdRuleDto> UpdateRuleAsync(int dayNumber, UpdateFmdRuleRequest request)
    {
        var rule = await _ruleRepository.GetRuleByDayAsync(dayNumber);
        if (rule == null)
        {
            rule = new FmdRule(dayNumber, request.MaxCalories, request.TargetProteinPercent, request.TargetFatPercent, request.TargetCarbPercent, request.Description);
            await _ruleRepository.CreateAsync(rule);
        }
        else
        {
            rule.UpdateRule(request.MaxCalories, request.TargetProteinPercent, request.TargetFatPercent, request.TargetCarbPercent, request.Description);
            await _ruleRepository.UpdateAsync(rule);
        }

        await _unitOfWork.SaveChangesAsync();

        return new FmdRuleDto(
            rule.Id, rule.DayNumber, rule.MaxCalories, rule.TargetProteinPercent, rule.TargetFatPercent, rule.TargetCarbPercent, rule.Description);
    }
}

public class MealTemplateService : IMealTemplateService
{
    private readonly IMealTemplateRepository _templateRepository;
    private readonly IUnitOfWork _unitOfWork;

    public MealTemplateService(IMealTemplateRepository templateRepository, IUnitOfWork unitOfWork)
    {
        _templateRepository = templateRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<List<MealTemplateDto>> GetAllTemplatesAsync()
    {
        var list = await _templateRepository.GetTemplatesAsync(false);
        return list.Select(t => new MealTemplateDto(
            t.Id, t.Name, t.Description, t.AssociatedFastingType, t.FmdDayNumber,
            t.TotalCalories, t.TotalProteinGrams, t.TotalCarbsGrams, t.TotalFatGrams, t.TotalFiberGrams,
            t.IsPlantSlantCompliant, t.IsHaraHachiBuOptimized, t.IsAdminTemplate, t.RecipeContentJson)).ToList();
    }

    public async Task<MealTemplateDto> CreateTemplateAsync(CreateMealTemplateRequest request)
    {
        var template = new MealTemplate
        {
            Name = request.Name,
            Description = request.Description,
            AssociatedFastingType = request.AssociatedFastingType,
            FmdDayNumber = request.FmdDayNumber,
            TotalCalories = request.TotalCalories,
            TotalProteinGrams = request.TotalProteinGrams,
            TotalCarbsGrams = request.TotalCarbsGrams,
            TotalFatGrams = request.TotalFatGrams,
            TotalFiberGrams = request.TotalFiberGrams,
            IsPlantSlantCompliant = request.IsPlantSlantCompliant,
            IsHaraHachiBuOptimized = request.IsHaraHachiBuOptimized,
            IsAdminTemplate = true,
            RecipeContentJson = request.RecipeContentJson
        };

        await _templateRepository.CreateAsync(template);
        await _unitOfWork.SaveChangesAsync();

        return new MealTemplateDto(
            template.Id, template.Name, template.Description, template.AssociatedFastingType, template.FmdDayNumber,
            template.TotalCalories, template.TotalProteinGrams, template.TotalCarbsGrams, template.TotalFatGrams, template.TotalFiberGrams,
            template.IsPlantSlantCompliant, template.IsHaraHachiBuOptimized, template.IsAdminTemplate, template.RecipeContentJson);
    }

    public async Task<MealTemplateDto> GetTemplateByIdAsync(Guid id)
    {
        var template = await _templateRepository.FoundOrThrowAsync(id, $"MealTemplate '{id}' not found.");
        return new MealTemplateDto(
            template.Id, template.Name, template.Description, template.AssociatedFastingType, template.FmdDayNumber,
            template.TotalCalories, template.TotalProteinGrams, template.TotalCarbsGrams, template.TotalFatGrams, template.TotalFiberGrams,
            template.IsPlantSlantCompliant, template.IsHaraHachiBuOptimized, template.IsAdminTemplate, template.RecipeContentJson);
    }
}
