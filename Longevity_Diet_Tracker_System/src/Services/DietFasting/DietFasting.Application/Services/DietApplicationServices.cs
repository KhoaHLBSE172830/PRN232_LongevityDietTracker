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

    public async Task<FastingSessionResponseDto> StartFastingAsync(StartFastingRequestDto dto)
    {
        var active = await _fastingRepository.GetActiveSessionAsync(dto.UserId);
        if (active != null)
            throw new ActiveFastingSessionAlreadyExistsException(dto.UserId);

        var session = FastingSession.Create(dto.UserId, dto.FastingType, dto.StartTimeUtc, dto.DurationHours);

        await _fastingRepository.CreateAsync(session);
        await _unitOfWork.SaveChangesAsync();

        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new FastingStartedIntegrationEvent(
                session.Id, session.UserId, session.FastingType.ToString(), session.StartTimeUtc, session.TargetEndTimeUtc));
        }

        return new FastingSessionResponseDto(
            session.Id, session.UserId, session.FastingType, session.StartTimeUtc,
            session.TargetEndTimeUtc, null, session.Status, null);
    }

    public async Task<FastingSessionResponseDto> EndFastingAsync(Guid sessionId)
    {
        var session = await _fastingRepository.FindByIdAsync(sessionId);
        if (session == null)
            throw new FastingSessionNotFoundException(sessionId);

        session.Complete(DateTime.UtcNow);

        await _fastingRepository.UpdateAsync(session);
        await _unitOfWork.SaveChangesAsync();

        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new FastingCompletedIntegrationEvent(
                session.Id, session.UserId, session.FastingType.ToString(),
                session.StartTimeUtc, session.ActualEndTimeUtc!.Value, session.ActualFastedHours ?? 0));
        }

        return new FastingSessionResponseDto(
            session.Id, session.UserId, session.FastingType, session.StartTimeUtc,
            session.TargetEndTimeUtc, session.ActualEndTimeUtc, session.Status, session.ActualFastedHours, session.MoodNotes);
    }

    public async Task<FastingSessionResponseDto?> GetActiveFastingSessionAsync(Guid userId)
    {
        var session = await _fastingRepository.GetActiveSessionAsync(userId);
        if (session == null) return null;

        return new FastingSessionResponseDto(
            session.Id, session.UserId, session.FastingType, session.StartTimeUtc,
            session.TargetEndTimeUtc, session.ActualEndTimeUtc, session.Status, session.ActualFastedHours, session.MoodNotes);
    }
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

        var count = await _fmdRepository.GetCycleCountAsync(dto.UserId);
        var cycle = FmdCycle.Create(dto.UserId, count + 1, dto.StartDate);

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
