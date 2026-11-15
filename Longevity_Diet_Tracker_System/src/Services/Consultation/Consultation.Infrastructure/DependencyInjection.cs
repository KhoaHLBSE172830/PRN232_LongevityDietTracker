using BuildingBlocks.Common.Repositories;
using BuildingBlocks.Grpc.Contracts;
using BuildingBlocks.Messaging.Abstractions;
using Consultation.Application.Repositories;
using Consultation.Application.Services;
using Consultation.Infrastructure.Core.Grpc;
using Consultation.Infrastructure.Database;
using Consultation.Infrastructure.Messaging;
using Consultation.Infrastructure.Repository;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Consultation.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddConsultationInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("ConsultationDb")
            ?? "Host=localhost;Port=5432;Database=consultation_db;Username=postgres;Password=postgres";

        services.AddDbContext<ConsultationDbContext>(options =>
        {
            options.UseNpgsql(connectionString);
        });

        // Repositories & Unit of Work
        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IConsultationSessionRepository, ConsultationSessionRepository>();
        services.AddScoped<INutritionistProfileRepository, NutritionistProfileRepository>();
        services.AddScoped<IAdviceNoteRepository, AdviceNoteRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // gRPC Client to Diet & Fasting Service
        services.AddScoped<IDietFastingGrpcClientService, DietFastingGrpcClient>();

        // RabbitMQ EventBus Publisher for Consultation Service
        services.AddSingleton<IEventBus, RabbitMqConsultationPublisher>();

        return services;
    }
}

