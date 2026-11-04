namespace DietFasting.Domain.Enums;

public enum MealType
{
    Breakfast = 1,
    Lunch = 2,
    Dinner = 3,
    Snack = 4
}

public enum FastingType
{
    Circadian = 1,          // 12:12
    Intermittent16_8 = 2,    // 16:8
    Intermittent18_6 = 3,    // 18:6
    Intermittent20_4 = 4,    // 20:4
    Extended = 5,           // 24h+
    FmdProtocol = 6         // 5-day Fasting Mimicking Diet
}

public enum FastingStatus
{
    InProgress = 1,
    Completed = 2,
    Cancelled = 3
}

public enum FmdStatus
{
    Planned = 1,
    Active = 2,
    Completed = 3,
    Cancelled = 4
}

