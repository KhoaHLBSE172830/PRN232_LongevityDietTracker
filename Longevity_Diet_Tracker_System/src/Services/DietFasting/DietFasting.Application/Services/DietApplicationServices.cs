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
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEventBus? _eventBus;

    public MealService(IMealLogRepository mealRepository, IUnitOfWork unitOfWork, IEventBus? eventBus = null)
    {
        _mealRepository = mealRepository;
        _unitOfWork = unitOfWork;
        _eventBus = eventBus;
    }

    public async Task<MealLogResponseDto> LogMealAsync(CreateMealLogDto dto)
    {
        var mealLog = new MealLog(dto.UserId, dto.MealType, dto.LoggedAt)
        {
            Notes = dto.Notes
        };

        foreach (var item in dto.FoodItems)
        {
            mealLog.FoodItems.Add(new MealFoodItem
            {
                ExternalFoodId = item.ExternalFoodId,
                FoodName = item.FoodName,
                ServingSize = item.ServingSize,
                ServingUnit = item.ServingUnit,
                Calories = item.Calories,
                ProteinGrams = item.ProteinGrams,
                CarbsGrams = item.CarbsGrams,
                FatGrams = item.FatGrams
            });
        }

        mealLog.RecalculateTotals();

        await _mealRepository.CreateAsync(mealLog);
        await _unitOfWork.SaveChangesAsync();

        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new MealLoggedIntegrationEvent(
                mealLog.Id, mealLog.UserId, mealLog.MealType.ToString(), mealLog.TotalCalories, mealLog.LoggedAt));
        }

        return new MealLogResponseDto(
            mealLog.Id, mealLog.UserId, mealLog.MealType, mealLog.LoggedAt,
            mealLog.TotalCalories, mealLog.TotalProteinGrams, mealLog.TotalCarbsGrams, mealLog.TotalFatGrams,
            mealLog.Notes,
            mealLog.FoodItems.Select(f => new FoodItemDto(
                f.ExternalFoodId, f.FoodName, f.ServingSize, f.ServingUnit,
                f.Calories, f.ProteinGrams, f.CarbsGrams, f.FatGrams)).ToList());
    }

    public async Task<List<MealLogResponseDto>> GetUserMealsAsync(Guid userId, DateTime date)
    {
        var logs = await _mealRepository.GetUserMealsByDateAsync(userId, date);

        return logs.Select(m => new MealLogResponseDto(
            m.Id, m.UserId, m.MealType, m.LoggedAt,
            m.TotalCalories, m.TotalProteinGrams, m.TotalCarbsGrams, m.TotalFatGrams,
            m.Notes,
            m.FoodItems.Select(f => new FoodItemDto(
                f.ExternalFoodId, f.FoodName, f.ServingSize, f.ServingUnit,
                f.Calories, f.ProteinGrams, f.CarbsGrams, f.FatGrams)).ToList()
        )).ToList();
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

        var targetEndTime = dto.StartTimeUtc.AddHours(dto.DurationHours);
        var session = new FastingSession
        {
            UserId = dto.UserId,
            FastingType = dto.FastingType,
            StartTimeUtc = dto.StartTimeUtc,
            TargetEndTimeUtc = targetEndTime,
            Status = FastingStatus.InProgress
        };

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

        session.Status = FastingStatus.Completed;
        session.ActualEndTimeUtc = DateTime.UtcNow;
        session.UpdatedAt = DateTime.UtcNow;

        await _fastingRepository.UpdateAsync(session);
        await _unitOfWork.SaveChangesAsync();

        if (_eventBus != null)
        {
            await _eventBus.PublishAsync(new FastingCompletedIntegrationEvent(
                session.Id, session.UserId, session.FastingType.ToString(),
                session.StartTimeUtc, session.ActualEndTimeUtc.Value, session.ActualFastedHours ?? 0));
        }

        return new FastingSessionResponseDto(
            session.Id, session.UserId, session.FastingType, session.StartTimeUtc,
            session.TargetEndTimeUtc, session.ActualEndTimeUtc, session.Status, session.ActualFastedHours);
    }

    public async Task<FastingSessionResponseDto?> GetActiveFastingSessionAsync(Guid userId)
    {
        var session = await _fastingRepository.GetActiveSessionAsync(userId);
        if (session == null) return null;

        return new FastingSessionResponseDto(
            session.Id, session.UserId, session.FastingType, session.StartTimeUtc,
            session.TargetEndTimeUtc, session.ActualEndTimeUtc, session.Status, session.ActualFastedHours);
    }
}

public class FmdService : IFmdService
{
    private readonly IFmdCycleRepository _fmdRepository;
    private readonly IUnitOfWork _unitOfWork;

    public FmdService(IFmdCycleRepository fmdRepository, IUnitOfWork unitOfWork)
    {
        _fmdRepository = fmdRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<FmdCycleResponseDto> StartCycleAsync(StartFmdCycleDto dto)
    {
        var active = await _fmdRepository.GetActiveCycleAsync(dto.UserId);
        if (active != null)
            throw new ActiveFmdCycleAlreadyExistsException(dto.UserId);

        var count = await _fmdRepository.GetCycleCountAsync(dto.UserId);
        var cycle = new FmdCycle
        {
            UserId = dto.UserId,
            CycleNumber = count + 1,
            StartDate = dto.StartDate,
            EndDate = dto.StartDate.AddDays(5),
            CurrentDay = 1,
            Status = FmdStatus.Active
        };

        await _fmdRepository.CreateAsync(cycle);
        await _unitOfWork.SaveChangesAsync();

        return new FmdCycleResponseDto(
            cycle.Id, cycle.UserId, cycle.CycleNumber, cycle.StartDate, cycle.EndDate, cycle.CurrentDay, cycle.Status);
    }

    public async Task<FmdCycleResponseDto?> GetActiveCycleAsync(Guid userId)
    {
        var cycle = await _fmdRepository.GetActiveCycleAsync(userId);
        if (cycle == null) return null;

        return new FmdCycleResponseDto(
            cycle.Id, cycle.UserId, cycle.CycleNumber, cycle.StartDate, cycle.EndDate, cycle.CurrentDay, cycle.Status);
    }
}

