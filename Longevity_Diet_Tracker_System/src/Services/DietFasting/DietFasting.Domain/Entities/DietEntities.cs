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
    public string? Notes { get; set; }

    public ICollection<MealFoodItem> FoodItems { get; set; } = new List<MealFoodItem>();

    public MealLog() { }

    public MealLog(Guid userId, MealType mealType, DateTime loggedAt)
    {
        UserId = userId;
        MealType = mealType;
        LoggedAt = loggedAt;
    }

    public void RecalculateTotals()
    {
        TotalCalories = FoodItems.Sum(f => f.Calories);
        TotalProteinGrams = FoodItems.Sum(f => f.ProteinGrams);
        TotalCarbsGrams = FoodItems.Sum(f => f.CarbsGrams);
        TotalFatGrams = FoodItems.Sum(f => f.FatGrams);
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
    public double TargetCaloriesDays2To5 { get; set; } = 750;
}

public class MealTemplate : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public FastingType AssociatedFastingType { get; set; }
    public int? FmdDayNumber { get; set; }
    public double TotalCalories { get; set; }
    public bool IsAdminTemplate { get; set; } = true;
    public string? RecipeContentJson { get; set; }
}
