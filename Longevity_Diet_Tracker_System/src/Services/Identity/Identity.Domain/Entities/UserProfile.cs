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

    public User? User { get; set; }
}
