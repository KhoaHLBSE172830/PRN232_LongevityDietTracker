using BuildingBlocks.Common.Entities;
using Consultation.Domain.Enums;
using Consultation.Domain.Exceptions;

namespace Consultation.Domain.Entities;

public class NutritionistProfile : BaseEntity
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Certification { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public bool IsVerified { get; set; }

    /// <summary>Các thẻ chuyên môn, phân tách bằng dấu phẩy (vd. "Fasting,FMD,Macros").</summary>
    public string Tags { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }

    public IReadOnlyList<string> TagList =>
        Tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

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
        // N5: quy đổi đúng múi giờ. Chuỗi có offset (vd +07:00) được .NET đọc thành Local: phải ToUniversalTime(),
        // KHÔNG được chỉ gán nhãn Utc (sẽ lệch đúng bằng offset). Chuỗi không có múi giờ (Unspecified) coi là UTC.
        var utcScheduled = scheduledAt.Kind switch
        {
            DateTimeKind.Utc => scheduledAt,
            DateTimeKind.Local => scheduledAt.ToUniversalTime(),
            _ => DateTime.SpecifyKind(scheduledAt, DateTimeKind.Utc)
        };

        if (utcScheduled <= DateTime.UtcNow)
        {
            throw new ConsultationBadRequestException("Thời gian đặt lịch tư vấn phải ở tương lai.");
        }

        return new ConsultationSession
        {
            UserId = userId,
            NutritionistId = nutritionistId,
            ScheduledAtUtc = utcScheduled,
            DurationMinutes = durationMinutes > 0 ? durationMinutes : 45,
            Status = ConsultationStatus.Pending,
            Notes = notes
        };
    }

    /// <summary>Thời lượng mỗi buổi tư vấn (phút) dùng khi tính khung giờ trống.</summary>
    public DateTime EndAtUtc => ScheduledAtUtc.AddMinutes(DurationMinutes);

    public bool BlocksSlot => Status is ConsultationStatus.Pending or ConsultationStatus.Confirmed;

    public void Confirm()
    {
        if (Status != ConsultationStatus.Pending)
            throw new ConsultationConflictException($"Chỉ xác nhận được lịch đang chờ (hiện tại: {Status}).");

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
        if (Status is ConsultationStatus.Completed or ConsultationStatus.Cancelled)
            throw new ConsultationConflictException($"Không thể hủy lịch ở trạng thái {Status}.");

        Status = ConsultationStatus.Cancelled;
        if (!string.IsNullOrEmpty(reason))
        {
            Notes = string.IsNullOrEmpty(Notes) ? reason : $"{Notes} | Cancelled: {reason}";
        }
        UpdatedAt = DateTime.UtcNow;
    }

    public void AttachAdvice(AdviceNote advice)
    {
        if (Status == ConsultationStatus.Completed || AdviceNote != null)
        {
            throw new ConsultationConflictException("Phiên tư vấn này đã có phiếu lời khuyên hoặc đã hoàn tất.");
        }

        if (Status == ConsultationStatus.Cancelled)
        {
            throw new ConsultationBadRequestException("Không thể kê phiếu lời khuyên cho phiên tư vấn đã bị hủy.");
        }

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

    public static AdviceNote Create(Guid sessionId, Guid userId, Guid nutritionistId, string summary, string dietary, string fasting)
    {
        if (string.IsNullOrWhiteSpace(summary))
            throw new ConsultationBadRequestException("Tóm tắt đánh giá y khoa không được để trống.");

        if (string.IsNullOrWhiteSpace(dietary))
            throw new ConsultationBadRequestException("Khuyến nghị dinh dưỡng không được để trống.");

        if (string.IsNullOrWhiteSpace(fasting))
            throw new ConsultationBadRequestException("Khuyến nghị nhịn ăn không được để trống.");

        return new AdviceNote(sessionId, userId, nutritionistId, summary, dietary, fasting);
    }
}
