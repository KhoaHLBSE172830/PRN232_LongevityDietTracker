using BuildingBlocks.Common.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Notification.Application.Repositories;
using Notification.Application.Services;
using Notification.Infrastructure.Database;
using Notification.Infrastructure.Repository;
using Notification.Infrastructure.Services;

namespace Notification.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddNotificationInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("NotificationDb")
            ?? "Host=localhost;Port=5432;Database=notification_db;Username=postgres;Password=postgres";

        services.AddDbContext<NotificationDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<INotificationLogRepository, NotificationLogRepository>();
        services.AddScoped<INotificationPreferenceRepository, NotificationPreferenceRepository>();

        services.AddScoped<IEmailService, SmtpEmailService>();

        return services;
    }
}

