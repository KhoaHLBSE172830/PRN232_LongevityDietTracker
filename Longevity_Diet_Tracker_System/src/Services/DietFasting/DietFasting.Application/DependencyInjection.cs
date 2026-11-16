using DietFasting.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace DietFasting.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddDietFastingApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IMealService, MealService>();
        services.AddScoped<IFastingService, FastingService>();
        services.AddScoped<IFastingReminderService, FastingReminderService>();
        services.AddScoped<IFmdService, FmdService>();
        services.AddScoped<IFmdRuleService, FmdRuleService>();
        services.AddScoped<IMealTemplateService, MealTemplateService>();
        services.AddScoped<IHabitService, HabitService>();

        return services;
    }
}
