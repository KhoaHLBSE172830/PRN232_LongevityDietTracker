using System.ComponentModel.DataAnnotations;
using BuildingBlocks.Grpc.Contracts;
using Consultation.Domain.Enums;

namespace Consultation.Application.DTOs;

public record NutritionistProfileDto(
    Guid Id,
    Guid UserId,
    string FullName,
    string Certification,
    string Specialization,
    string Bio,
    bool IsVerified,
    List<string>? Tags = null,
    string? AvatarUrl = null);

public record CancelConsultationDto(string? Reason = null);

public record AvailabilitySlotDto(DateTime StartUtc, DateTime EndUtc, bool IsAvailable);

public record NutritionistAvailabilityDto(Guid NutritionistId, DateOnly Date, List<AvailabilitySlotDto> Slots);

public record BookConsultationDto(
    Guid UserId,
    [Required(ErrorMessage = "NutritionistId không được để trống")]
    Guid NutritionistId,
    [Required(ErrorMessage = "ScheduledAtUtc không được để trống")]
    DateTime ScheduledAtUtc,
    [MaxLength(500)]
    string? Notes,
    string? UserEmail = null);

public record ConsultationSessionDto(
    Guid Id,
    Guid UserId,
    Guid NutritionistId,
    DateTime ScheduledAtUtc,
    int DurationMinutes,
    ConsultationStatus Status,
    string? Notes,
    string? NutritionistName = null);

public record SendAdviceDto(
    [Required(ErrorMessage = "ConsultationSessionId không được để trống")]
    Guid ConsultationSessionId,
    Guid? UserId,
    Guid? NutritionistId,
    [Required(ErrorMessage = "AdviceSummary không được để trống")]
    [MinLength(5, ErrorMessage = "Tóm tắt lời khuyên phải từ 5 ký tự")]
    [MaxLength(2000)]
    string AdviceSummary,
    [Required(ErrorMessage = "DietaryRecommendations không được để trống")]
    [MinLength(5, ErrorMessage = "Khuyến nghị dinh dưỡng phải từ 5 ký tự")]
    [MaxLength(2000)]
    string DietaryRecommendations,
    [Required(ErrorMessage = "FastingRecommendations không được để trống")]
    [MinLength(5, ErrorMessage = "Khuyến nghị nhịn ăn phải từ 5 ký tự")]
    [MaxLength(2000)]
    string FastingRecommendations);

public record AdviceNoteDto(
    Guid Id,
    Guid ConsultationSessionId,
    Guid UserId,
    Guid NutritionistId,
    string AdviceSummary,
    string DietaryRecommendations,
    string FastingRecommendations,
    DateTime CreatedAtUtc,
    string? NutritionistName = null);

public record UserHealthReviewDto(
    Guid UserId,
    FastingSummaryContract FastingSummary,
    NutritionSummaryContract NutritionSummary,
    FmdCycleStatusContract FmdCycleStatus);
