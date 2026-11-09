using BuildingBlocks.Common.Repositories;
using BuildingBlocks.Grpc.Contracts;
using DietFasting.Application.Repositories;
using DietFasting.Application.Services;
using DietFasting.Infrastructure.Core.Cache;
using DietFasting.Infrastructure.Core.Grpc;
using DietFasting.Infrastructure.Core.Nutrition;
using DietFasting.Infrastructure.Database;
using DietFasting.Infrastructure.Repository;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace DietFasting.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddDietFastingInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DietDb")
            ?? "Host=localhost;Port=5432;Database=diet_db;Username=postgres;Password=postgres";

        services.AddDbContext<DietDbContext>(options =>
        {
            // AGENT.md 3.2: Use snake_case naming convention for tables, columns, indexes
            options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention();
        });

        // Repositories & Unit of Work
        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IMealLogRepository, MealLogRepository>();
        services.AddScoped<IFastingSessionRepository, FastingSessionRepository>();
        services.AddScoped<IFmdCycleRepository, FmdCycleRepository>();
        services.AddScoped<IFmdRuleRepository, FmdRuleRepository>();
        services.AddScoped<IMealTemplateRepository, MealTemplateRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Redis Cache
        var redisConn = configuration.GetConnectionString("Redis") ?? "localhost:6379";
        try
        {
            var multiplexer = ConnectionMultiplexer.Connect(redisConn);
            services.AddSingleton<IConnectionMultiplexer>(multiplexer);
        }
        catch { }
        services.AddScoped<IRedisCacheService, RedisCacheService>();

        // Nutrition External API
        services.AddHttpClient<INutritionService, NutritionApiClient>();

        // gRPC Server Implementation
        services.AddScoped<IDietFastingGrpcClientService, DietFastingGrpcServer>();

        return services;
    }
}
