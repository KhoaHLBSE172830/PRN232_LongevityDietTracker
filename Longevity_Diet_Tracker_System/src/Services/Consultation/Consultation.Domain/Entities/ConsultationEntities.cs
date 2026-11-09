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

    public NutritionistProfile() { }

    public void Verify()
    {
        IsVerified = true;
        UpdatedAt = DateTime.UtcNow;
    }
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

    public ConsultationSession() { }

    public static ConsultationSession Schedule(Guid userId, Guid nutritionistId, DateTime scheduledAt, int durationMinutes = 45, string? notes = null)
    {
        return new ConsultationSession
        {
            UserId = userId,
            NutritionistId = nutritionistId,
            ScheduledAtUtc = scheduledAt,
            DurationMinutes = durationMinutes,
            Status = ConsultationStatus.Pending,
            Notes = notes
        };
    }

    public void Confirm()
    {
        Status = ConsultationStatus.Confirmed;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Complete()
    {
        Status = ConsultationStatus.Completed;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel(string? reason = null)
    {
        Status = ConsultationStatus.Cancelled;
        if (!string.IsNullOrEmpty(reason))
        {
            Notes = string.IsNullOrEmpty(Notes) ? reason : $"{Notes} | Cancelled: {reason}";
        }
        UpdatedAt = DateTime.UtcNow;
    }

    public void AttachAdvice(AdviceNote advice)
    {
        AdviceNote = advice;
        Complete();
    }
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

    public AdviceNote() { }

    public AdviceNote(Guid sessionId, Guid userId, Guid nutritionistId, string summary, string dietary, string fasting)
    {
        ConsultationSessionId = sessionId;
        UserId = userId;
        NutritionistId = nutritionistId;
        AdviceSummary = summary;
        DietaryRecommendations = dietary;
        FastingRecommendations = fasting;
    }
}
