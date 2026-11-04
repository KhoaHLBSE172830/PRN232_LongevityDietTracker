using BuildingBlocks.Common.Filters;
using BuildingBlocks.Common.Middlewares;
using Identity.Application;
using Identity.Infrastructure;
using Microsoft.AspNetCore.Mvc;

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
builder.Services.AddIdentityApplicationServices();
builder.Services.AddIdentityInfrastructureServices(builder.Configuration);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Global Exception Handling Middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Identity Service v1"));
}

app.UseAuthorization();
app.MapControllers();

app.Run();
