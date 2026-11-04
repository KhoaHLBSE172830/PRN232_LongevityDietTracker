using BuildingBlocks.Common.Entities;
using Consultation.Domain.Enums;

namespace Consultation.Domain.Entities;

public class NutritionistProfile : BaseEntity
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Certification { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public bool IsVerified { get; set; }

    public ICollection<ConsultationSession> Sessions { get; set; } = new List<ConsultationSession>();
}

public class ConsultationSession : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid NutritionistId { get; set; }
    public DateTime ScheduledAtUtc { get; set; }
    public int DurationMinutes { get; set; } = 45;
    public ConsultationStatus Status { get; set; } = ConsultationStatus.Pending;
    public string? Notes { get; set; }

    public NutritionistProfile? Nutritionist { get; set; }
    public AdviceNote? AdviceNote { get; set; }
}

public class AdviceNote : BaseEntity
{
    public Guid ConsultationSessionId { get; set; }
    public Guid UserId { get; set; }
    public Guid NutritionistId { get; set; }
    public string AdviceSummary { get; set; } = string.Empty;
    public string DietaryRecommendations { get; set; } = string.Empty;
    public string FastingRecommendations { get; set; } = string.Empty;

    public ConsultationSession? ConsultationSession { get; set; }
}
