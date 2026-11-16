using BuildingBlocks.Common.Exceptions;
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

    /// <summary>Khoảng [bắt đầu, kết thúc) theo UTC của "ngày địa phương" chứa thời điểm loggedAt.</summary>
    private static (DateTime StartUtc, DateTime EndUtc) LocalDayRange(DateTime loggedAt, int utcOffsetMinutes)
    {
        var offset = Math.Clamp(utcOffsetMinutes, -14 * 60, 14 * 60);
        var utc = loggedAt.Kind == DateTimeKind.Local ? loggedAt.ToUniversalTime() : DateTime.SpecifyKind(loggedAt, DateTimeKind.Utc);
        var localDate = utc.AddMinutes(offset).Date;
        var startUtc = DateTime.SpecifyKind(localDate.AddMinutes(-offset), DateTimeKind.Utc);
        return (startUtc, startUtc.AddDays(1));
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
            var (dayStart, dayEnd) = LocalDayRange(dto.LoggedAt, dto.UtcOffsetMinutes);
            var dayCaloriesAlready = (await _mealRepository.GetUserMealsInRangeAsync(dto.UserId, dayStart, dayEnd)).Sum(m => m.TotalCalories);
            var projectedTotal = dayCaloriesAlready + mealLog.TotalCalories;

            var rule = await _fmdRuleRepository.GetRuleByDayAsync(activeFmd.CurrentDay);
            var thresholdLimit = rule?.MaxCalories ?? FmdCycle.DefaultCaloriesForDay(activeFmd.CurrentDay);

            if (projectedTotal > thresholdLimit)
            {
                var reason = $"Day {activeFmd.CurrentDay} FMD Calorie Limit Exceeded! Projected: {projectedTotal:F0} kcal vs Threshold: {thresholdLimit:F0} kcal.";
                mealLog.MarkThresholdExceeded(reason);

                if (_eventBus != null)
                {
                    await _eventBus.PublishAsync(new FmdCycleAlertIntegrationEvent(
                        activeFmd.Id, activeFmd.UserId, activeFmd.CurrentDay, reason, dto.NotificationEmail));
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

    private static MealFoodItem ToFoodItem(CreateFoodItemDto item) => new()
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
    };

    private async Task<MealLog> GetOwnedMealAsync(Guid mealId, Guid requesterUserId, bool isAdmin)
    {
        var meal = await _mealRepository.GetWithItemsAsync(mealId) ?? throw new MealLogNotFoundException(mealId);
        if (!isAdmin && meal.UserId != requesterUserId)
            throw new ForbiddenException("Bạn chỉ được thao tác với bữa ăn của chính mình.");
        return meal;
    }

    /// <summary>Tạo bữa ăn từ một mẫu (một dòng món đại diện cho cả mẫu, 1 phần).</summary>
    public async Task<MealLogResponseDto> LogMealFromTemplateAsync(Guid userId, MealTemplateDto template, ApplyMealTemplateDto dto)
    {
        var item = new CreateFoodItemDto(
            $"template-{template.Id}", template.Name, 1, "phần",
            template.TotalCalories, template.TotalProteinGrams, template.TotalCarbsGrams, template.TotalFatGrams, template.TotalFiberGrams);
        var create = new CreateMealLogDto(
            userId, dto.MealType, dto.LoggedAt ?? DateTime.UtcNow, new List<CreateFoodItemDto> { item },
            template.Description, template.IsHaraHachiBuOptimized, dto.SatietyPercentage, dto.UtcOffsetMinutes);
        return await LogMealAsync(create);
    }

    public async Task<MealLogResponseDto> UpdateMealAsync(Guid mealId, Guid requesterUserId, bool isAdmin, UpdateMealLogDto dto, string? notificationEmail = null)
    {
        if (dto.FoodItems == null || dto.FoodItems.Count == 0)
            throw new BadRequestException("Bữa ăn phải có ít nhất một món.");

        var meal = await GetOwnedMealAsync(mealId, requesterUserId, isAdmin);

        meal.UpdateDetails(dto.MealType, dto.LoggedAt, dto.Notes, dto.IsHaraHachiBuCompliant, dto.SatietyPercentage);
        meal.ReplaceFoodItems(dto.FoodItems.Select(ToFoodItem));

        // Kiểm tra lại ngưỡng FMD của ngày (không tính chính bữa này theo số cũ).
        meal.ClearThreshold();
        var activeFmd = await _fmdRepository.GetActiveCycleAsync(meal.UserId);
        if (activeFmd != null)
        {
            var (dayStart, dayEnd) = LocalDayRange(meal.LoggedAt, dto.UtcOffsetMinutes);
            var sameDay = await _mealRepository.GetUserMealsInRangeAsync(meal.UserId, dayStart, dayEnd);
            var projected = sameDay.Where(m => m.Id != meal.Id).Sum(m => m.TotalCalories) + meal.TotalCalories;
            var rule = await _fmdRuleRepository.GetRuleByDayAsync(activeFmd.CurrentDay);
            var limit = rule?.MaxCalories ?? FmdCycle.DefaultCaloriesForDay(activeFmd.CurrentDay);
            if (projected > limit)
            {
                var reason = $"Day {activeFmd.CurrentDay} FMD Calorie Limit Exceeded! Projected: {projected:F0} kcal vs Threshold: {limit:F0} kcal.";
                meal.MarkThresholdExceeded(reason);
                if (_eventBus != null)
                    await _eventBus.PublishAsync(new FmdCycleAlertIntegrationEvent(activeFmd.Id, activeFmd.UserId, activeFmd.CurrentDay, reason, notificationEmail));
            }
        }

        await _mealRepository.UpdateAsync(meal);
        await _unitOfWork.SaveChangesAsync();
        return MapToDto(meal);
    }

    public async Task DeleteMealAsync(Guid mealId, Guid requesterUserId, bool isAdmin)
    {
        var meal = await GetOwnedMealAsync(mealId, requesterUserId, isAdmin);
        await _mealRepository.DeleteAsync(meal);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<List<MealLogResponseDto>> GetUserMealsAsync(Guid userId, DateTime date, int utcOffsetMinutes = 0)
    {
        // "date" là ngày theo giờ địa phương của người dùng (yyyy-MM-dd, Kind=Unspecified). Npgsql chỉ nhận UTC,
        // nên đổi mốc 00:00 địa phương về UTC rồi lấy khoảng 24 giờ.
        var offset = Math.Clamp(utcOffsetMinutes, -14 * 60, 14 * 60);
        var startUtc = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc).AddMinutes(-offset);
        var logs = await _mealRepository.GetUserMealsInRangeAsync(userId, startUtc, startUtc.AddDays(1));
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

    public async Task<FastingSessionResponseDto> PauseFastingAsync(Guid sessionId, Guid requesterUserId, CancellationToken cancellationToken = default)
    {
        var session = await GetOwnedSessionAsync(sessionId, requesterUserId);
        session.Pause(DateTime.UtcNow);
        await _fastingRepository.UpdateAsync(session);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapToDto(session);
    }

    public async Task<FastingSessionResponseDto> ResumeFastingAsync(Guid sessionId, Guid requesterUserId, CancellationToken cancellationToken = default)
    {
        var session = await GetOwnedSessionAsync(sessionId, requesterUserId);
        session.Resume(DateTime.UtcNow);
        await _fastingRepository.UpdateAsync(session);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return MapToDto(session);
    }

    public async Task<List<FastingSessionResponseDto>> GetHistoryAsync(Guid userId, int limit = 30, CancellationToken cancellationToken = default)
    {
        var sessions = await _fastingRepository.GetHistoryAsync(userId, Math.Clamp(limit, 1, 200));
        return sessions.Select(MapToDto).ToList();
    }

    public async Task<FastingStatsDto> GetStatsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var completed = await _fastingRepository.GetCompletedSessionsAsync(userId);
        var days = completed
            .Where(s => s.ActualEndTimeUtc.HasValue)
            .Select(s => DateOnly.FromDateTime(s.ActualEndTimeUtc!.Value.ToUniversalTime()))
            .Distinct()
            .OrderBy(d => d)
            .ToList();

        // Chuỗi dài nhất
        int longest = 0, run = 0;
        DateOnly? prev = null;
        foreach (var d in days)
        {
            run = prev.HasValue && d == prev.Value.AddDays(1) ? run + 1 : 1;
            longest = Math.Max(longest, run);
            prev = d;
        }

        // Chuỗi hiện tại: còn hiệu lực nếu ngày gần nhất là hôm nay hoặc hôm qua.
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var current = 0;
        if (days.Count > 0 && days[^1] >= today.AddDays(-1))
        {
            current = 1;
            for (var i = days.Count - 1; i > 0 && days[i - 1] == days[i].AddDays(-1); i--) current++;
        }

        return new FastingStatsDto(current, longest, completed.Count, Math.Round(completed.Sum(s => s.ActualFastedHours ?? 0), 2));
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
        s.ActualEndTimeUtc, s.Status, s.ActualFastedHours, s.MoodNotes, s.IsPaused, s.PausedAtUtc);
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
        var targetCal = rule?.MaxCalories ?? FmdCycle.DefaultCaloriesForDay(cycle.CurrentDay);

        return new FmdCycleResponseDto(
            cycle.Id, cycle.UserId, cycle.CycleNumber, cycle.StartDate, cycle.EndDate, cycle.CurrentDay, cycle.Status, targetCal);
    }

    public async Task<List<FmdCycleResponseDto>> GetHistoryAsync(Guid userId)
    {
        var cycles = await _fmdRepository.WhereAsync(c => c.UserId == userId);
        var rules = await _fmdRuleRepository.GetAllRulesAsync();
        return cycles
            .OrderByDescending(c => c.StartDate)
            .Select(c => new FmdCycleResponseDto(
                c.Id, c.UserId, c.CycleNumber, c.StartDate, c.EndDate, c.CurrentDay, c.Status,
                rules.FirstOrDefault(r => r.DayNumber == c.CurrentDay)?.MaxCalories ?? FmdCycle.DefaultCaloriesForDay(c.CurrentDay)))
            .ToList();
    }

    public async Task<FmdCycleResponseDto> CancelCycleAsync(Guid cycleId, Guid requesterUserId, bool isAdmin)
    {
        var cycle = await _fmdRepository.FindByIdAsync(cycleId) ?? throw new FmdCycleNotFoundException(cycleId);
        if (!isAdmin && cycle.UserId != requesterUserId)
            throw new ForbiddenException("Bạn chỉ được hủy chu kỳ FMD của chính mình.");

        cycle.Cancel();
        await _fmdRepository.UpdateAsync(cycle);
        await _unitOfWork.SaveChangesAsync();

        var rule = await _fmdRuleRepository.GetRuleByDayAsync(cycle.CurrentDay);
        return new FmdCycleResponseDto(
            cycle.Id, cycle.UserId, cycle.CycleNumber, cycle.StartDate, cycle.EndDate, cycle.CurrentDay, cycle.Status,
            rule?.MaxCalories ?? FmdCycle.DefaultCaloriesForDay(cycle.CurrentDay));
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
                new(2, 780, 9, 44, 47, "Ngày 2: Đốt mỡ sâu & Kích hoạt tự thực bào Autophagy (780 kcal)"),
                new(3, 760, 9, 44, 47, "Ngày 3: Thanh lọc tế bào lão hóa & Giảm chỉ số viêm (760 kcal)"),
                new(4, 760, 9, 44, 47, "Ngày 4: Tái tạo hệ miễn dịch & Trẻ hóa sinh học (760 kcal)"),
                new(5, 780, 9, 44, 47, "Ngày 5: Hoàn tất chu kỳ & Phục hồi tế bào gốc (780 kcal)")
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


public class HabitService : IHabitService
{
    public const int WaterGoalMl = 2000;
    public const int MovementGoalMinutes = 30;
    public const int SleepGoalMinutes = 480;
    public const int MindfulGoalMinutes = 10;

    private readonly IHabitLogRepository _habitRepository;
    private readonly IUnitOfWork _unitOfWork;

    public HabitService(IHabitLogRepository habitRepository, IUnitOfWork unitOfWork)
    {
        _habitRepository = habitRepository;
        _unitOfWork = unitOfWork;
    }

    private static HabitDayDto ToDto(DateOnly date, HabitLog? h) =>
        new(date, h?.WaterMl ?? 0, h?.MovementMinutes ?? 0, WaterGoalMl, MovementGoalMinutes,
            h?.SleepMinutes ?? 0, h?.MindfulMinutes ?? 0, SleepGoalMinutes, MindfulGoalMinutes);

    public async Task<HabitDayDto> GetDayAsync(Guid userId, DateOnly date)
        => ToDto(date, await _habitRepository.GetByUserAndDateAsync(userId, date));

    public async Task<HabitDayDto> SetDayAsync(Guid userId, DateOnly date, SetHabitDto dto)
    {
        var existing = await _habitRepository.GetByUserAndDateAsync(userId, date);
        var log = existing ?? HabitLog.Create(userId, date);
        log.Set(dto.WaterMl, dto.MovementMinutes, dto.SleepMinutes, dto.MindfulMinutes);
        if (existing == null) await _habitRepository.CreateAsync(log); else await _habitRepository.UpdateAsync(log);
        await _unitOfWork.SaveChangesAsync();
        return ToDto(date, log);
    }

    public async Task<HabitDayDto> AddToDayAsync(Guid userId, DateOnly date, AddHabitDto dto)
    {
        var existing = await _habitRepository.GetByUserAndDateAsync(userId, date);
        var log = existing ?? HabitLog.Create(userId, date);
        log.Add(dto.WaterMl, dto.MovementMinutes, dto.SleepMinutes, dto.MindfulMinutes);
        if (existing == null) await _habitRepository.CreateAsync(log); else await _habitRepository.UpdateAsync(log);
        await _unitOfWork.SaveChangesAsync();
        return ToDto(date, log);
    }

    /// <summary>Một ngày "đạt" khi uống đủ nước và vận động đủ phút. Chuỗi hiện tại còn hiệu lực nếu hôm nay hoặc hôm qua đạt.</summary>
    public async Task<HabitStreakDto> GetStreakAsync(Guid userId, DateOnly today)
    {
        var logs = await _habitRepository.GetRangeAsync(userId, today.AddDays(-400), today);
        var met = logs.Where(l => l.WaterMl >= WaterGoalMl && l.MovementMinutes >= MovementGoalMinutes)
                      .Select(l => l.LogDate).Distinct().OrderBy(d => d).ToList();

        int longest = 0, run = 0;
        DateOnly? prev = null;
        foreach (var d in met)
        {
            run = prev.HasValue && d == prev.Value.AddDays(1) ? run + 1 : 1;
            longest = Math.Max(longest, run);
            prev = d;
        }

        var current = 0;
        if (met.Count > 0 && met[^1] >= today.AddDays(-1))
        {
            current = 1;
            for (var i = met.Count - 1; i > 0 && met[i - 1] == met[i].AddDays(-1); i--) current++;
        }
        return new HabitStreakDto(current, longest, WaterGoalMl, MovementGoalMinutes);
    }

    public async Task<List<HabitDayDto>> GetRangeAsync(Guid userId, DateOnly from, DateOnly to)
    {
        if (to < from || to.DayNumber - from.DayNumber > 92)
            throw new InvalidHabitLogException("Range must be 1 to 93 days.");
        var logs = await _habitRepository.GetRangeAsync(userId, from, to);
        var result = new List<HabitDayDto>();
        for (var d = from; d <= to; d = d.AddDays(1))
            result.Add(ToDto(d, logs.FirstOrDefault(x => x.LogDate == d)));
        return result;
    }
}
