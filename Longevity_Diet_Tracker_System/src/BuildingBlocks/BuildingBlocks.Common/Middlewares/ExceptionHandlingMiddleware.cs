using System.Text.Json;
using BuildingBlocks.Common.Exceptions;
using BuildingBlocks.Common.ResponseCode;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace BuildingBlocks.Common.Middlewares;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        _logger.LogError(exception, "Unhandled Exception occurred: {Message}", exception.Message);

        context.Response.ContentType = "application/json";

        int statusCode = StatusCodes.Status500InternalServerError;
        string message = "Internal Server Error";

        switch (exception)
        {
            case BaseHttpException httpEx:
                statusCode = httpEx.StatusCode;
                message = httpEx.Message;
                break;

            case KeyNotFoundException:
                statusCode = StatusCodes.Status404NotFound;
                message = exception.Message;
                break;

            case UnauthorizedAccessException:
                statusCode = StatusCodes.Status401Unauthorized;
                message = "Unauthorized";
                break;

            case ArgumentException:
                statusCode = StatusCodes.Status400BadRequest;
                message = exception.Message;
                break;

            default:
                message = "An unexpected internal server error occurred.";
                break;
        }

        context.Response.StatusCode = statusCode;
        var response = new BaseResp
        {
            Code = statusCode,
            Message = message
        };

        var json = JsonSerializer.Serialize(response);
        await context.Response.WriteAsync(json);
    }
}

