using BuildingBlocks.Common.Filters;
using BuildingBlocks.Common.Middlewares;
using Microsoft.AspNetCore.Mvc;
using Notification.Application;
using Notification.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add Controllers with Global ValidationFilter like Mimo
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ValidationFilter>();
});

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.SuppressModelStateInvalidFilter = true;
});

// Register Onion Architecture layers
builder.Services.AddNotificationApplicationServices();
builder.Services.AddNotificationInfrastructureServices(builder.Configuration);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Global Exception Handling Middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Notification Service v1"));
}

app.UseAuthorization();
app.MapControllers();

app.Run();
