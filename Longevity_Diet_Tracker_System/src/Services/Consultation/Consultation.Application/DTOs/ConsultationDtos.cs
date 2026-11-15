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
    bool IsVerified);

public record BookConsultationDto(
    Guid UserId,
    Guid NutritionistId,
    DateTime ScheduledAtUtc,
    string? Notes);

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
    Guid ConsultationSessionId,
    Guid UserId,
    Guid NutritionistId,
    string AdviceSummary,
    string DietaryRecommendations,
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

