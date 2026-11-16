using System.Text;
using BuildingBlocks.Common.Filters;
using BuildingBlocks.Common.Middlewares;
using DietFasting.Application;
using DietFasting.Infrastructure;
using DietFasting.Infrastructure.Core.Grpc;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Two endpoints (README port table): REST on 5002 (HTTP/1.1), gRPC on 7002 (HTTP/2 only).
// Cleartext HTTP/2 cannot be negotiated on a shared HTTP/1.1 port, hence the dedicated gRPC port.
// Ports can be overridden with "Ports:Http" / "Ports:Grpc" in configuration.
var httpPort = builder.Configuration.GetValue("Ports:Http", 5002);
var grpcPort = builder.Configuration.GetValue("Ports:Grpc", 7002);
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(httpPort, listen => listen.Protocols = HttpProtocols.Http1);
    options.ListenLocalhost(grpcPort, listen => listen.Protocols = HttpProtocols.Http2);
});

builder.Services.AddGrpc();

// Add Controllers with Global ValidationFilter
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ValidationFilter>();
});

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.SuppressModelStateInvalidFilter = true;
});

// AGENT.md 4.3: RBAC & JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "super_secret_jwt_key_longevity_diet_tracker_32chars!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "LongevityIdentityService";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "LongevityDietTrackerClients";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        RoleClaimType = System.Security.Claims.ClaimTypes.Role,
        NameClaimType = System.Security.Claims.ClaimTypes.NameIdentifier
    };
});

builder.Services.AddAuthorization();

// Register Onion Architecture layers
builder.Services.AddDietFastingApplicationServices();
builder.Services.AddDietFastingInfrastructureServices(builder.Configuration);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Diet & Fasting Service", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Global Exception Handling Middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Diet & Fasting Service v1"));
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// gRPC authentication (AGENT.md 4.3). Off by default so the current Consultation client (no token yet) keeps working;
// set "Grpc:RequireAuth": true once it forwards the caller's JWT in the "authorization" metadata.
// Only Nutritionist/Admin may read another user's summary. Whether the nutritionist has a valid ConsultationSession with
// that user cannot be verified here (different database): the Consultation Service must check it before calling.
var grpcEndpoint = app.MapGrpcService<DietFastingGrpcService>();
if (builder.Configuration.GetValue("Grpc:RequireAuth", false))
{
    grpcEndpoint.RequireAuthorization(new AuthorizeAttribute { Roles = "Nutritionist,Admin" });
    app.Logger.LogInformation("gRPC authentication is ENABLED (roles: Nutritionist, Admin)");
}
else
{
    app.Logger.LogWarning("gRPC authentication is DISABLED (Grpc:RequireAuth = false). Do not expose port {Port} outside the internal network.", grpcPort);
}

app.Run();
