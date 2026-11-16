using System.Security.Claims;
using BuildingBlocks.Common.Exceptions;
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

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id
            : throw new UnauthorizedException("Token does not contain a valid user id.");

    // Chỉ chủ tài khoản hoặc Admin được xem/sửa dữ liệu thông báo của một người dùng.
    private void EnsureOwnerOrAdmin(Guid userId)
    {
        if (User.IsInRole("Admin")) return;
        if (userId != CurrentUserId)
            throw new ForbiddenException("Bạn chỉ được truy cập thông báo của chính mình.");
    }

    // Gửi thông báo thủ công: chỉ Admin (các service khác gửi qua RabbitMQ, không qua endpoint này).
    [Authorize(Roles = "Admin")]
    [HttpPost("send")]
    public async Task<IActionResult> SendNotification([FromBody] SendNotificationRequest request, CancellationToken cancellationToken)
    {
        var result = await _notificationService.SendAndLogNotificationAsync(request, cancellationToken);
        return SuccessResp.Created(result, "Notification processed successfully");
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserNotifications(Guid userId, CancellationToken cancellationToken)
    {
        EnsureOwnerOrAdmin(userId);
        var result = await _notificationService.GetUserNotificationsAsync(userId, cancellationToken);
        return SuccessResp.Ok(result);
    }

    [HttpGet("user/{userId:guid}/unread-count")]
    public async Task<IActionResult> GetUnreadCount(Guid userId, CancellationToken cancellationToken)
    {
        EnsureOwnerOrAdmin(userId);
        var count = await _notificationService.GetUnreadCountAsync(userId, cancellationToken);
        return SuccessResp.Ok(new UnreadCountDto(count));
    }

    [HttpPost("{notificationId:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid notificationId, CancellationToken cancellationToken)
    {
        var result = await _notificationService.MarkAsReadAsync(notificationId, CurrentUserId, User.IsInRole("Admin"), cancellationToken);
        return SuccessResp.Ok(result, "Notification marked as read");
    }

    [HttpPost("user/{userId:guid}/read-all")]
    public async Task<IActionResult> MarkAllAsRead(Guid userId, CancellationToken cancellationToken)
    {
        EnsureOwnerOrAdmin(userId);
        var count = await _notificationService.MarkAllAsReadAsync(userId, cancellationToken);
        return SuccessResp.Ok(new { marked = count }, "All notifications marked as read");
    }

    [HttpGet("preferences/{userId:guid}")]
    public async Task<IActionResult> GetPreferences(Guid userId, CancellationToken cancellationToken)
    {
        EnsureOwnerOrAdmin(userId);
        var result = await _notificationService.GetUserPreferenceAsync(userId, cancellationToken);
        return SuccessResp.Ok(result);
    }

    [HttpPut("preferences/{userId:guid}")]
    public async Task<IActionResult> UpdatePreferences(Guid userId, [FromBody] UpdatePreferenceRequest request, CancellationToken cancellationToken)
    {
        EnsureOwnerOrAdmin(userId);
        var result = await _notificationService.UpdateUserPreferenceAsync(userId, request, cancellationToken);
        return SuccessResp.Ok(result, "Notification preferences updated successfully");
    }
}
