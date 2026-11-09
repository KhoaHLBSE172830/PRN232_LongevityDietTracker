using BuildingBlocks.Common.Entities;
using DietFasting.Domain.Enums;

namespace DietFasting.Domain.Entities;

public class MealLog : BaseEntity
{
    public Guid UserId { get; set; }
    public MealType MealType { get; set; }
    public DateTime LoggedAt { get; set; } = DateTime.UtcNow;
    public double TotalCalories { get; set; }
    public double TotalProteinGrams { get; set; }
    public double TotalCarbsGrams { get; set; }
    public double TotalFatGrams { get; set; }
    public double TotalFiberGrams { get; set; }
    public string? Notes { get; set; }

    // Blue Zones Power 9: "80% Rule" (Hara Hachi Bu)
    public bool IsHaraHachiBuCompliant { get; set; } = true;
    public int SatietyPercentage { get; set; } = 80;

    // FMD 5-day cycle invariant monitoring
    public bool ExceededThreshold { get; set; } = false;
    public string? ThresholdViolationNotes { get; set; }

    public ICollection<MealFoodItem> FoodItems { get; set; } = new List<MealFoodItem>();

    public MealLog() { }

    public MealLog(Guid userId, MealType mealType, DateTime loggedAt, bool isHaraHachiBu = true, int satietyPercentage = 80)
    {
        UserId = userId;
        MealType = mealType;
        LoggedAt = loggedAt;
        IsHaraHachiBuCompliant = isHaraHachiBu;
        SatietyPercentage = satietyPercentage;
    }

    public void AddFoodItem(MealFoodItem item)
    {
        FoodItems.Add(item);
        RecalculateTotals();
    }

    public void RecalculateTotals()
    {
        TotalCalories = FoodItems.Sum(f => f.Calories);
        TotalProteinGrams = FoodItems.Sum(f => f.ProteinGrams);
        TotalCarbsGrams = FoodItems.Sum(f => f.CarbsGrams);
        TotalFatGrams = FoodItems.Sum(f => f.FatGrams);
        TotalFiberGrams = FoodItems.Sum(f => f.FiberGrams);
    }

    public void MarkThresholdExceeded(string reason)
    {
        ExceededThreshold = true;
        ThresholdViolationNotes = reason;
        UpdatedAt = DateTime.UtcNow;
    }
}

public class MealFoodItem : BaseEntity
{
    public Guid MealLogId { get; set; }
    public string ExternalFoodId { get; set; } = string.Empty;
    public string FoodName { get; set; } = string.Empty;
    public double ServingSize { get; set; }
    public string ServingUnit { get; set; } = "g";
    public double Calories { get; set; }
    public double ProteinGrams { get; set; }
    public double CarbsGrams { get; set; }
    public double FatGrams { get; set; }
    // Blue Zones Power 9: "Plant Slant" - high dietary fiber
    public double FiberGrams { get; set; }

    public MealLog? MealLog { get; set; }
}

public class FastingSession : BaseEntity
{
    public Guid UserId { get; set; }
    public FastingType FastingType { get; set; }
    public DateTime StartTimeUtc { get; set; }
    public DateTime TargetEndTimeUtc { get; set; }
    public DateTime? ActualEndTimeUtc { get; set; }
    public FastingStatus Status { get; set; } = FastingStatus.InProgress;
    public string? MoodNotes { get; set; }

    public double TargetHours => (TargetEndTimeUtc - StartTimeUtc).TotalHours;
    public double? ActualFastedHours => ActualEndTimeUtc.HasValue 
        ? (ActualEndTimeUtc.Value - StartTimeUtc).TotalHours 
        : null;

    public FastingSession() { }

    public static FastingSession Create(Guid userId, FastingType type, DateTime startTime, double durationHours)
    {
        return new FastingSession
        {
            UserId = userId,
            FastingType = type,
            StartTimeUtc = startTime,
            TargetEndTimeUtc = startTime.AddHours(durationHours),
            Status = FastingStatus.InProgress
        };
    }

    public void Complete(DateTime actualEndTime, string? notes = null)
    {
        if (Status != FastingStatus.InProgress)
            throw new InvalidOperationException($"Cannot complete session in '{Status}' status.");

        Status = FastingStatus.Completed;
        ActualEndTimeUtc = actualEndTime;
        if (!string.IsNullOrEmpty(notes)) MoodNotes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel(string? reason = null)
    {
        if (Status != FastingStatus.InProgress)
            throw new InvalidOperationException($"Cannot cancel session in '{Status}' status.");

        Status = FastingStatus.Cancelled;
        ActualEndTimeUtc = DateTime.UtcNow;
        if (!string.IsNullOrEmpty(reason)) MoodNotes = reason;
        UpdatedAt = DateTime.UtcNow;
    }
}

public class FmdCycle : BaseEntity
{
    public Guid UserId { get; set; }
    public int CycleNumber { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int CurrentDay { get; set; } = 1;
    public FmdStatus Status { get; set; } = FmdStatus.Planned;
    public double TargetCaloriesDay1 { get; set; } = 1100;
    public double TargetCaloriesDays2To5 { get; set; } = 725;

    public FmdCycle() { }

    public static FmdCycle Create(Guid userId, int cycleNumber, DateTime startDate)
    {
        return new FmdCycle
        {
            UserId = userId,
            CycleNumber = cycleNumber,
            StartDate = startDate,
            EndDate = startDate.AddDays(5),
            CurrentDay = 1,
            Status = FmdStatus.Active,
            TargetCaloriesDay1 = 1100,
            TargetCaloriesDays2To5 = 725
        };
    }

    public void AdvanceDay()
    {
        if (CurrentDay < 5)
        {
            CurrentDay++;
            UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            Complete();
        }
    }

    public (bool isExceeded, string? reason) CheckThreshold(double totalCaloriesToday)
    {
        var maxLimit = CurrentDay == 1 ? TargetCaloriesDay1 : TargetCaloriesDays2To5;
        if (totalCaloriesToday > maxLimit)
        {
            return (true, $"Total calories for Day {CurrentDay} ({totalCaloriesToday:F0} kcal) exceeded FMD threshold ({maxLimit:F0} kcal).");
        }
        return (false, null);
    }

    public void Complete()
    {
        Status = FmdStatus.Completed;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        Status = FmdStatus.Cancelled;
        UpdatedAt = DateTime.UtcNow;
    }
}

public class FmdRule : BaseEntity
{
    public int DayNumber { get; set; } // 1 to 5
    public double MaxCalories { get; set; }
    public double TargetProteinPercent { get; set; }
    public double TargetFatPercent { get; set; }
    public double TargetCarbPercent { get; set; }
    public string Description { get; set; } = string.Empty;

    public FmdRule() { }

    public FmdRule(int dayNumber, double maxCalories, double proteinPct, double fatPct, double carbPct, string description)
    {
        DayNumber = dayNumber;
        MaxCalories = maxCalories;
        TargetProteinPercent = proteinPct;
        TargetFatPercent = fatPct;
        TargetCarbPercent = carbPct;
        Description = description;
    }

    public void UpdateRule(double maxCalories, double proteinPct, double fatPct, double carbPct, string description)
    {
        MaxCalories = maxCalories;
        TargetProteinPercent = proteinPct;
        TargetFatPercent = fatPct;
        TargetCarbPercent = carbPct;
        Description = description;
        UpdatedAt = DateTime.UtcNow;
    }
}

public class MealTemplate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public FastingType AssociatedFastingType { get; set; }
    public int? FmdDayNumber { get; set; }
    public double TotalCalories { get; set; }
    public double TotalProteinGrams { get; set; }
    public double TotalCarbsGrams { get; set; }
    public double TotalFatGrams { get; set; }
    public double TotalFiberGrams { get; set; }
    public bool IsPlantSlantCompliant { get; set; } = true;
    public bool IsHaraHachiBuOptimized { get; set; } = true;
    public bool IsAdminTemplate { get; set; } = true;
    public string? RecipeContentJson { get; set; }
}
