using BuildingBlocks.Common.Middlewares;
using BuildingBlocks.Common.ResponseCode;
using BuildingBlocks.Messaging.Abstractions;
using JobService.Application.Jobs;
using JobService.Infrastructure.Messaging;

var builder = WebApplication.CreateBuilder(args);

// Register publishers & jobs
builder.Services.AddSingleton<IEventBus, RabbitMqJobPublisher>();
builder.Services.AddScoped<IFastingScheduleJob, FastingScheduleJob>();
builder.Services.AddScoped<IFmdCycleDailyJob, FmdCycleDailyJob>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Job Service v1"));
}

// Background scheduler endpoints or Hangfire dashboard mapping
app.MapGet("/", () => Results.Ok(new GenericResp<object>
{
    Code = RespCode.OK,
    Message = "Job Service [Hangfire] is running",
    Data = new
    {
        service = "Job Service [Hangfire]",
        status = "Running",
        storage = "Job DB [PostgreSQL]",
        broker = "RabbitMQ"
    }
}));

app.MapPost("/jobs/trigger/fasting-check", async (IFastingScheduleJob job) =>
{
    await job.ExecuteAsync();
    return Results.Ok(new GenericResp<object>
    {
        Code = RespCode.OK,
        Message = "Fasting schedule check triggered and event published to RabbitMQ."
    });
});

app.MapPost("/jobs/trigger/fmd-check", async (IFmdCycleDailyJob job) =>
{
    await job.ExecuteAsync();
    return Results.Ok(new GenericResp<object>
    {
        Code = RespCode.OK,
        Message = "FMD daily check triggered and event published to RabbitMQ."
    });
});

app.Run();
