var builder = WebApplication.CreateBuilder(args);

// Add YARP Reverse Proxy
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");

app.MapGet("/", () => Results.Ok(new
{
    gateway = "Longevity Diet Tracker API Gateway [YARP]",
    status = "Active",
    routes = new[]
    {
        "/api/auth/* -> Identity Service (:5001)",
        "/api/users/* -> Identity Service (:5001)",
        "/api/meals/* -> Diet & Fasting Service (:5002)",
        "/api/fasting/* -> Diet & Fasting Service (:5002)",
        "/api/fmd/* -> Diet & Fasting Service (:5002)",
        "/api/nutrition/* -> Diet & Fasting Service (:5002)",
        "/api/consultations/* -> Consultation Service (:5003)",
        "/api/notifications/* -> Notification Service (:5004)"
    }
}));

app.MapReverseProxy();

app.Run();
