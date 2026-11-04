using Consultation.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Consultation.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddConsultationApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IConsultationService, ConsultationService>();
        return services;
    }
}

