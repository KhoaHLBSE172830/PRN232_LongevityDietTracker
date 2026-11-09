using BuildingBlocks.Common.Repositories;
using Identity.Application.Repositories;
using Identity.Application.Services;
using Identity.Infrastructure.Core.Auth;
using Identity.Infrastructure.Core.JWT;
using Identity.Infrastructure.Database;
using Identity.Infrastructure.Repository;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Identity.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("IdentityDb")
            ?? "Host=localhost;Port=5432;Database=identity_db;Username=postgres;Password=postgres";

        services.AddDbContext<IdentityDbContext>(options =>
        {
            // AGENT.md 3.2: snake_case naming convention
            options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention();
        });

        // Repositories & Unit of Work
        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Core Infrastructure Services
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IGoogleAuthService, GoogleAuthService>();

        return services;
    }
}
