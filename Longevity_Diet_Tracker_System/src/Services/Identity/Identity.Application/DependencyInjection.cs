using Identity.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Identity.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        return services;
    }
}

