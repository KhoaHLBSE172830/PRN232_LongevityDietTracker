using BuildingBlocks.Common.ResponseCode;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Notification.Application.DTOs;
using Notification.Application.Services;

namespace Notification.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendNotification([FromBody] SendNotificationRequest request, CancellationToken cancellationToken)
    {
        var result = await _notificationService.SendAndLogNotificationAsync(request, cancellationToken);
        return SuccessResp.Created(result, "Notification processed successfully");
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserNotifications(Guid userId, CancellationToken cancellationToken)
    {
        var result = await _notificationService.GetUserNotificationsAsync(userId, cancellationToken);
        return SuccessResp.Ok(result);
    }

    [HttpGet("preferences/{userId:guid}")]
    public async Task<IActionResult> GetPreferences(Guid userId, CancellationToken cancellationToken)
    {
        var result = await _notificationService.GetUserPreferenceAsync(userId, cancellationToken);
        return SuccessResp.Ok(result);
    }

    [HttpPut("preferences/{userId:guid}")]
    public async Task<IActionResult> UpdatePreferences(Guid userId, [FromBody] UpdatePreferenceRequest request, CancellationToken cancellationToken)
    {
        var result = await _notificationService.UpdateUserPreferenceAsync(userId, request, cancellationToken);
        return SuccessResp.Ok(result, "Notification preferences updated successfully");
    }
}
