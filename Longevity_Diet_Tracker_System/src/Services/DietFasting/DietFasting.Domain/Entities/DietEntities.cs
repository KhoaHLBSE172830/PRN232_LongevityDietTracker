using BuildingBlocks.Common.Entities;
using DietFasting.Domain.Enums;
using DietFasting.Domain.Exceptions;

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

    public void UpdateDetails(MealType mealType, DateTime? loggedAt, string? notes, bool isHaraHachiBu, int satietyPercentage)
    {
        MealType = mealType;
        if (loggedAt.HasValue) LoggedAt = loggedAt.Value;
        Notes = notes;
        IsHaraHachiBuCompliant = isHaraHachiBu;
        SatietyPercentage = satietyPercentage;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ReplaceFoodItems(IEnumerable<MealFoodItem> items)
    {
        FoodItems.Clear();
        foreach (var item in items) FoodItems.Add(item);
        RecalculateTotals();
        UpdatedAt = DateTime.UtcNow;
    }

    public void ClearThreshold()
    {
        ExceededThreshold = false;
        ThresholdViolationNotes = null;
        UpdatedAt = DateTime.UtcNow;
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

    /// <summary>
    /// E-mail used for fasting reminders. Copied from the user's JWT when the session starts, because Diet &amp; Fasting
    /// cannot query Identity (Database-per-Service). Null when the token carried no usable e-mail.
    /// </summary>
    public string? NotificationEmail { get; set; }

    /// <summary>Thời điểm bắt đầu tạm dừng; null nếu đang chạy. Phiên tạm dừng vẫn ở trạng thái InProgress
    /// (giữ ràng buộc "tối đa 1 phiên đang chạy mỗi người").</summary>
    public DateTime? PausedAtUtc { get; set; }

    /// <summary>Tổng thời gian đã tạm dừng (giây), không tính đoạn đang tạm dừng hiện tại.</summary>
    public double TotalPausedSeconds { get; set; }

    public bool IsPaused => PausedAtUtc.HasValue;

    /// <summary>Mục tiêu nhịn (giờ) không bao gồm thời gian tạm dừng.</summary>
    public double TargetHours => (TargetEndTimeUtc - StartTimeUtc).TotalHours - TotalPausedSeconds / 3600.0;
    public double? ActualFastedHours => ActualEndTimeUtc.HasValue
        ? Math.Max(0, (ActualEndTimeUtc.Value - StartTimeUtc).TotalHours - TotalPausedSeconds / 3600.0)
        : null;

    public FastingSession() { }

    public const double MinDurationHours = 0.5;
    public const double MaxDurationHours = 168; // 7 days

    public const int MaxEmailLength = 256;

    public static FastingSession Create(Guid userId, FastingType type, DateTime startTime, double durationHours, string? notificationEmail = null)
    {
        if (userId == Guid.Empty)
            throw new InvalidFastingSessionException("UserId is required.");
        if (!Enum.IsDefined(type))
            throw new InvalidFastingSessionException($"Fasting type '{(int)type}' is not supported.");
        if (double.IsNaN(durationHours) || durationHours < MinDurationHours || durationHours > MaxDurationHours)
            throw new InvalidFastingSessionException(
                $"Duration must be between {MinDurationHours} and {MaxDurationHours} hours.");

        return new FastingSession
        {
            UserId = userId,
            FastingType = type,
            StartTimeUtc = startTime,
            TargetEndTimeUtc = startTime.AddHours(durationHours),
            Status = FastingStatus.InProgress,
            NotificationEmail = NormalizeEmail(notificationEmail)
        };
    }

    // Lenient on purpose: only drops values that cannot possibly be an address (reminder falls back to a default).
    private static string? NormalizeEmail(string? email)
    {
        var trimmed = email?.Trim();
        return string.IsNullOrEmpty(trimmed) || trimmed.Length > MaxEmailLength || !trimmed.Contains('@')
            ? null
            : trimmed;
    }

    /// <summary>Tạm dừng: đồng hồ dừng cho đến khi Resume.</summary>
    public void Pause(DateTime now)
    {
        if (Status != FastingStatus.InProgress)
            throw new InvalidFastingSessionException($"Cannot pause session in '{Status}' status.");
        if (IsPaused)
            throw new InvalidFastingSessionException("Session is already paused.");

        PausedAtUtc = now;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Tiếp tục: dời mốc kết thúc dự kiến đúng bằng thời gian đã tạm dừng.</summary>
    public void Resume(DateTime now)
    {
        if (Status != FastingStatus.InProgress)
            throw new InvalidFastingSessionException($"Cannot resume session in '{Status}' status.");
        if (!IsPaused)
            throw new InvalidFastingSessionException("Session is not paused.");

        AccountPause(now);
        UpdatedAt = DateTime.UtcNow;
    }

    private void AccountPause(DateTime now)
    {
        var pausedFor = Math.Max(0, (now - PausedAtUtc!.Value).TotalSeconds);
        TotalPausedSeconds += pausedFor;
        TargetEndTimeUtc = TargetEndTimeUtc.AddSeconds(pausedFor);
        PausedAtUtc = null;
    }

    public void Complete(DateTime actualEndTime, string? notes = null)
    {
        if (Status != FastingStatus.InProgress)
            throw new InvalidFastingSessionException($"Cannot complete session in '{Status}' status.");
        if (IsPaused) AccountPause(actualEndTime);

        Status = FastingStatus.Completed;
        ActualEndTimeUtc = actualEndTime;
        if (!string.IsNullOrEmpty(notes)) MoodNotes = notes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel(string? reason = null)
    {
        if (Status != FastingStatus.InProgress)
            throw new InvalidFastingSessionException($"Cannot cancel session in '{Status}' status.");

        var now = DateTime.UtcNow;
        if (IsPaused) AccountPause(now);
        Status = FastingStatus.Cancelled;
        ActualEndTimeUtc = now;
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
    // Hai cột cũ giữ nguyên để không đổi schema; định mức thực tế theo từng ngày lấy từ DefaultCaloriesForDay / bảng fmd_rules.
    public double TargetCaloriesDay1 { get; set; } = 1100;
    public double TargetCaloriesDays2To5 { get; set; } = 760;

    /// <summary>Định mức kcal mặc định theo ngày (thiết kế Figma): 1100 / 780 / 760 / 760 / 780.</summary>
    public static double DefaultCaloriesForDay(int day) => day switch
    {
        1 => 1100,
        2 => 780,
        3 => 760,
        4 => 760,
        5 => 780,
        _ => 760
    };

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
            TargetCaloriesDays2To5 = 760
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
        var maxLimit = DefaultCaloriesForDay(CurrentDay);
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
        if (Status is FmdStatus.Completed or FmdStatus.Cancelled)
            throw new InvalidFmdCycleException($"Cannot cancel a cycle in '{Status}' status.");

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


/// <summary>Thói quen sống khỏe theo ngày của một người dùng: lượng nước đã uống và số phút vận động.</summary>
public class HabitLog : BaseEntity
{
    public const int MaxWaterMl = 10000;
    public const int MaxMovementMinutes = 1440;

    public Guid UserId { get; set; }
    /// <summary>Ngày theo giờ địa phương của người dùng (client gửi yyyy-MM-dd).</summary>
    public DateOnly LogDate { get; set; }
    public int WaterMl { get; set; }
    public int MovementMinutes { get; set; }
    public int SleepMinutes { get; set; }
    public int MindfulMinutes { get; set; }

    public HabitLog() { }

    public static HabitLog Create(Guid userId, DateOnly date)
    {
        if (userId == Guid.Empty)
            throw new InvalidHabitLogException("UserId is required.");
        return new HabitLog { UserId = userId, LogDate = date };
    }

    /// <summary>Đặt giá trị tuyệt đối (null = giữ nguyên).</summary>
    public void Set(int? waterMl, int? movementMinutes, int? sleepMinutes = null, int? mindfulMinutes = null)
    {
        if (sleepMinutes.HasValue) SleepMinutes = Validate(sleepMinutes.Value, MaxMovementMinutes, "SleepMinutes");
        if (mindfulMinutes.HasValue) MindfulMinutes = Validate(mindfulMinutes.Value, MaxMovementMinutes, "MindfulMinutes");
        if (waterMl.HasValue) WaterMl = Validate(waterMl.Value, MaxWaterMl, "WaterMl");
        if (movementMinutes.HasValue) MovementMinutes = Validate(movementMinutes.Value, MaxMovementMinutes, "MovementMinutes");
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Cộng thêm (có thể âm để hoàn tác), kết quả luôn nằm trong [0, tối đa].</summary>
    public void Add(int waterMl, int movementMinutes, int sleepMinutes = 0, int mindfulMinutes = 0)
    {
        SleepMinutes = Math.Clamp(SleepMinutes + sleepMinutes, 0, MaxMovementMinutes);
        MindfulMinutes = Math.Clamp(MindfulMinutes + mindfulMinutes, 0, MaxMovementMinutes);
        WaterMl = Math.Clamp(WaterMl + waterMl, 0, MaxWaterMl);
        MovementMinutes = Math.Clamp(MovementMinutes + movementMinutes, 0, MaxMovementMinutes);
        UpdatedAt = DateTime.UtcNow;
    }

    private static int Validate(int value, int max, string name)
    {
        if (value < 0 || value > max)
            throw new InvalidHabitLogException($"{name} must be between 0 and {max}.");
        return value;
    }
}
