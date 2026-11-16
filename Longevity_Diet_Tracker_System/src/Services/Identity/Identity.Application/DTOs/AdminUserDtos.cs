using Identity.Domain.Enums;

namespace Identity.Application.DTOs;

public class UserQueryParameters
{
    private const int MaxPageSize = 100;
    private int _pageSize = 10;
    private int _pageNumber = 1;

    public int PageNumber
    {
        get => _pageNumber;
        set => _pageNumber = value < 1 ? 1 : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > MaxPageSize ? MaxPageSize : (value < 1 ? 10 : value);
    }

    public string? SearchTerm { get; set; }
    public UserRole? Role { get; set; }
    public bool? IsActive { get; set; }
}

public record UserSummaryDto(
    Guid Id,
    string Email,
    string FullName,
    string Role,
    bool IsActive,
    bool IsEmailVerified,
    bool GoogleLinked,
    DateTime? CreatedAt,
    DateTime? UpdatedAt,
    bool HasProfile,
    string? DietaryPreference,
    string? PreferredFastingType,
    int? DailyCalorieTarget
);

public record PagedResultDto<T>(
    IReadOnlyList<T> Items,
    int PageNumber,
    int PageSize,
    int TotalCount,
    int TotalPages,
    bool HasPreviousPage,
    bool HasNextPage
)
{
    public static PagedResultDto<T> Create(IReadOnlyList<T> items, int totalCount, int pageNumber, int pageSize)
    {
        var totalPages = pageSize > 0 ? (int)Math.Ceiling((double)totalCount / pageSize) : 0;
        return new PagedResultDto<T>(
            items,
            pageNumber,
            pageSize,
            totalCount,
            totalPages,
            HasPreviousPage: pageNumber > 1,
            HasNextPage: pageNumber < totalPages
        );
    }
}

public record SetUserStatusRequestDto(
    bool IsActive,
    string? Reason = null
);

public record UserStatusResponseDto(
    Guid UserId,
    string Email,
    string FullName,
    bool IsActive,
    DateTime UpdatedAt,
    string Message
);

public record UserOverviewStatsDto(
    int TotalUsers,
    int ActiveUsers,
    int LockedUsers,
    int EmailVerifiedUsers,
    int GoogleLinkedUsers
);

public record RoleBreakdownStatsDto(
    int RegularUsers,
    int Nutritionists,
    int Administrators
);

public record RegistrationTrendsDto(
    int NewUsersToday,
    int NewUsersThisWeek,
    int NewUsersThisMonth
);

public record LongevityProfileStatsDto(
    int CompletedProfilesCount,
    double ProfileCompletionRatePercent,
    double? AverageDailyCalorieTarget,
    double? AverageHeightCm,
    double? AverageCurrentWeightKg,
    Dictionary<string, int> DietaryPreferences,
    Dictionary<string, int> FastingTypePreferences,
    int WaterReminderEnabledCount,
    int EveningReminderEnabledCount
);

public record SystemHealthSummaryDto(
    DateTime GeneratedAtUtc,
    string Environment,
    int ActiveRefreshTokensCount
);

public record AdminDashboardStatsDto(
    UserOverviewStatsDto UserStats,
    RoleBreakdownStatsDto RoleStats,
    RegistrationTrendsDto RegistrationTrends,
    LongevityProfileStatsDto LongevityProfileStats,
    SystemHealthSummaryDto SystemSummary
);
