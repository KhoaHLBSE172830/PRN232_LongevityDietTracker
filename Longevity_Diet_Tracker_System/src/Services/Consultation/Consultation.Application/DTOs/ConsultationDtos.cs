using BuildingBlocks.Grpc.Contracts;
using Consultation.Domain.Enums;

namespace Consultation.Application.DTOs;

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
    string? Notes);

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
    DateTime CreatedAtUtc);

public record UserHealthReviewDto(
    Guid UserId,
    FastingSummaryContract FastingSummary,
    NutritionSummaryContract NutritionSummary,
    FmdCycleStatusContract FmdCycleStatus);

