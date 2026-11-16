using BuildingBlocks.Common.Middlewares;
using BuildingBlocks.Common.ResponseCode;
using BuildingBlocks.Messaging.Abstractions;
using Hangfire;
using Hangfire.PostgreSql;
using Hangfire.Storage;
using JobService.Application.Jobs;
using JobService.Infrastructure.Messaging;

var builder = WebApplication.CreateBuilder(args);

// README port table: Job Service listens on 5005 (override with "Ports:Http").
var httpPort = builder.Configuration.GetValue("Ports:Http", 5005);
builder.WebHost.ConfigureKestrel(options => options.ListenLocalhost(httpPort));

// Register publishers & jobs
builder.Services.AddSingleton<IEventBus, RabbitMqJobPublisher>();
builder.Services.AddScoped<IFastingScheduleJob, FastingScheduleJob>();
builder.Services.AddScoped<IFmdCycleDailyJob, FmdCycleDailyJob>();
builder.Services.AddScoped<IWeeklyNutritionSummaryJob, WeeklyNutritionSummaryJob>();

// Hangfire: job state is stored in PostgreSQL "job_db" (schema "hangfire" is created automatically).
var jobDbConnection = builder.Configuration.GetConnectionString("JobDb")
    ?? "Host=localhost;Port=5432;Database=job_db;Username=postgres;Password=postgres";

builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(
        options => options.UseNpgsqlConnection(jobDbConnection),
        // Default poll is 15s: a manually triggered job would wait that long before running (bad for live demos).
        new PostgreSqlStorageOptions { QueuePollInterval = TimeSpan.FromSeconds(1) }));
builder.Services.AddHangfireServer();

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

// Hangfire dashboard (by default only reachable from the local machine).
app.UseHangfireDashboard("/hangfire");

// Recurring jobs (idempotent: AddOrUpdate keeps a single definition per id across restarts).
var recurringJobs = app.Services.GetRequiredService<IRecurringJobManager>();
var recurringOptions = new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc };
recurringJobs.AddOrUpdate<IFastingScheduleJob>(
    JobSchedule.FastingCheckId, job => job.ExecuteAsync(CancellationToken.None), JobSchedule.FastingCheckCron, recurringOptions);
recurringJobs.AddOrUpdate<IFmdCycleDailyJob>(
    JobSchedule.FmdDailyCheckId, job => job.ExecuteAsync(CancellationToken.None), JobSchedule.FmdDailyCheckCron, recurringOptions);
recurringJobs.AddOrUpdate<IWeeklyNutritionSummaryJob>(
    JobSchedule.WeeklySummaryId, job => job.ExecuteAsync(CancellationToken.None), JobSchedule.WeeklySummaryCron, recurringOptions);

app.MapGet("/", () => Results.Ok(new GenericResp<object>
{
    Code = RespCode.OK,
    Message = "Job Service [Hangfire] is running",
    Data = new
    {
        service = "Job Service [Hangfire]",
        status = "Running",
        storage = "Job DB [PostgreSQL]",
        broker = "RabbitMQ",
        dashboard = "/hangfire"
    }
}));

// Lists the recurring jobs registered in Hangfire (useful to prove the schedulers exist).
app.MapGet("/jobs/recurring", (JobStorage storage) =>
{
    using var connection = storage.GetConnection();
    var jobs = connection.GetRecurringJobs().Select(j => new
    {
        id = j.Id,
        cron = j.Cron,
        nextExecutionUtc = j.NextExecution,
        lastExecutionUtc = j.LastExecution,
        lastJobState = j.LastJobState
    });

    return Results.Ok(new GenericResp<object> { Code = RespCode.OK, Message = "Recurring jobs", Data = jobs });
});

// Manual triggers (live demo). Jobs are enqueued through Hangfire so they show up in the dashboard.
app.MapPost("/jobs/trigger/fasting-check", (IBackgroundJobClient jobs) =>
{
    var id = jobs.Enqueue<IFastingScheduleJob>(job => job.ExecuteAsync(CancellationToken.None));
    return Results.Ok(new GenericResp<object>
    {
        Code = RespCode.OK,
        Message = "Fasting schedule check enqueued; it publishes 'fasting.schedule.trigger' to RabbitMQ.",
        Data = new { hangfireJobId = id }
    });
});

app.MapPost("/jobs/trigger/fmd-check", (IBackgroundJobClient jobs) =>
{
    var id = jobs.Enqueue<IFmdCycleDailyJob>(job => job.ExecuteAsync(CancellationToken.None));
    return Results.Ok(new GenericResp<object>
    {
        Code = RespCode.OK,
        Message = "FMD daily check enqueued; it publishes 'fasting.schedule.trigger' (FmdCycleDailyJob) to RabbitMQ.",
        Data = new { hangfireJobId = id }
    });
});

app.MapPost("/jobs/trigger/weekly-summary", (IBackgroundJobClient jobs) =>
{
    var id = jobs.Enqueue<IWeeklyNutritionSummaryJob>(job => job.ExecuteAsync(CancellationToken.None));
    return Results.Ok(new GenericResp<object>
    {
        Code = RespCode.OK,
        Message = "Weekly nutrition summary enqueued; it publishes 'fasting.schedule.trigger' (WeeklyNutritionSummaryJob) to RabbitMQ.",
        Data = new { hangfireJobId = id }
    });
});

app.Run();
