using BuildingBlocks.Common.Entities;

namespace Identity.Domain.Entities;

public class UserProfile : BaseEntity
{
    public Guid UserId { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public double? HeightCm { get; set; }
    public double? CurrentWeightKg { get; set; }
    public double? TargetWeightKg { get; set; }
    public string? DietaryPreference { get; set; }
    public string? HealthGoals { get; set; }

    // Mục tiêu & ưa thích (màn Hồ sơ theo Figma)
    public int? DailyCalorieTarget { get; set; }
    public int? ProteinPercent { get; set; }
    public int? CarbsPercent { get; set; }
    public int? FatPercent { get; set; }
    public string? PreferredFastingType { get; set; }   // vd "16:8"
    public bool WaterReminderEnabled { get; set; }
    public bool EveningReminderEnabled { get; set; }

    public User? User { get; set; }
}
