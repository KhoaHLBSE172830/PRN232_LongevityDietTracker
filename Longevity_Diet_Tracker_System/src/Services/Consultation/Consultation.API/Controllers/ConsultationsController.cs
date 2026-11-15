using System.Security.Claims;
using BuildingBlocks.Common.Exceptions;
using BuildingBlocks.Common.ResponseCode;
using Consultation.Application.DTOs;
using Consultation.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Consultation.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ConsultationsController : ControllerBase
{
    private readonly IConsultationService _consultationService;

    public ConsultationsController(IConsultationService consultationService)
    {
        _consultationService = consultationService;
    }

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id
            : throw new UnauthorizedException("Token does not contain a valid user id.");

    private bool IsNutritionistOrAdmin =>
        User.IsInRole("Nutritionist") || User.IsInRole("Admin");

    /// <summary>
    /// Lấy danh sách các chuyên gia dinh dưỡng được chứng nhận (công khai cho hội viên tham khảo)
    /// </summary>
    [AllowAnonymous]
    [HttpGet("nutritionists")]
    public async Task<IActionResult> GetNutritionists()
    {
        var result = await _consultationService.GetNutritionistsAsync();
        return SuccessResp.Ok(result, "Lấy danh sách chuyên gia dinh dưỡng thành công");
    }

    /// <summary>
    /// Lấy chi tiết hồ sơ chuyên gia dinh dưỡng theo ID
    /// </summary>
    [AllowAnonymous]
    [HttpGet("nutritionists/{id:guid}")]
    public async Task<IActionResult> GetNutritionistById(Guid id)
    {
        var result = await _consultationService.GetNutritionistByIdAsync(id);
        return SuccessResp.Ok(result, "Lấy thông tin chuyên gia thành công");
    }

    /// <summary>
    /// Hội viên đặt lịch hẹn tư vấn mới với chuyên gia (UserId gắn từ JWT)
    /// </summary>
    [HttpPost("book")]
    public async Task<IActionResult> BookSession([FromBody] BookConsultationDto dto)
    {
        var effectiveDto = dto with { UserId = CurrentUserId };
        var result = await _consultationService.BookSessionAsync(effectiveDto);
        return SuccessResp.Created(result, "Đặt lịch tư vấn với chuyên gia thành công");
    }

    /// <summary>
    /// Hội viên xem toàn bộ danh sách lịch hẹn của mình (chỉ xem được của chính mình trừ khi là Nutritionist/Admin)
    /// </summary>
    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserSessions(Guid userId)
    {
        if (userId != CurrentUserId && !IsNutritionistOrAdmin)
            throw new ForbiddenException("Bạn chỉ có quyền xem danh sách lịch hẹn của chính mình.");

        var result = await _consultationService.GetUserSessionsAsync(userId);
        return SuccessResp.Ok(result, "Lấy danh sách lịch hẹn cá nhân thành công");
    }

    /// <summary>
    /// Hội viên xem danh sách các phiếu lời khuyên (Advice Notes) nhận được từ bác sĩ
    /// </summary>
    [HttpGet("user/{userId:guid}/advices")]
    public async Task<IActionResult> GetUserAdvices(Guid userId)
    {
        if (userId != CurrentUserId && !IsNutritionistOrAdmin)
            throw new ForbiddenException("Bạn chỉ có quyền xem phiếu lời khuyên của chính mình.");

        var result = await _consultationService.GetUserAdvicesAsync(userId);
        return SuccessResp.Ok(result, "Lấy danh sách phiếu lời khuyên thành công");
    }

    /// <summary>
    /// Bác sĩ xem danh sách các buổi hẹn tư vấn của mình
    /// </summary>
    [Authorize(Roles = "Nutritionist,Admin")]
    [HttpGet("nutritionist/{nutritionistId:guid}")]
    public async Task<IActionResult> GetNutritionistSessions(Guid nutritionistId)
    {
        var result = await _consultationService.GetNutritionistSessionsAsync(nutritionistId);
        return SuccessResp.Ok(result, "Lấy lịch làm việc của bác sĩ thành công");
    }

    /// <summary>
    /// Bác sĩ gửi phiếu lời khuyên dinh dưỡng cho hội viên (tự động bắn RabbitMQ sang Notification Service)
    /// </summary>
    [Authorize(Roles = "Nutritionist,Admin")]
    [HttpPost("advice")]
    public async Task<IActionResult> SendAdvice([FromBody] SendAdviceDto dto)
    {
        var result = await _consultationService.SendAdviceAsync(dto, CurrentUserId);
        return SuccessResp.Created(result, "Gửi phiếu lời khuyên thành công và đã kích hoạt thông báo qua RabbitMQ");
    }

    /// <summary>
    /// Bác sĩ truy vấn snapshot sức khỏe của hội viên (gRPC Sync sang Diet & Fasting Service cổng 7002)
    /// </summary>
    [Authorize(Roles = "Nutritionist,Admin")]
    [HttpGet("review-user/{userId:guid}")]
    public async Task<IActionResult> ReviewUserProgress(Guid userId)
    {
        var result = await _consultationService.ReviewUserDietProgressAsync(CurrentUserId, userId);
        return SuccessResp.Ok(result, "Truy vấn snapshot tiến độ dinh dưỡng qua gRPC thành công");
    }
}
