using BuildingBlocks.Common.ResponseCode;
using Consultation.Application.DTOs;
using Consultation.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Consultation.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConsultationsController : ControllerBase
{
    private readonly IConsultationService _consultationService;

    public ConsultationsController(IConsultationService consultationService)
    {
        _consultationService = consultationService;
    }

    /// <summary>
    /// Lấy danh sách các chuyên gia dinh dưỡng được chứng nhận (để hội viên chọn đặt lịch)
    /// </summary>
    [AllowAnonymous]
    [HttpGet("nutritionists")]
    public async Task<IActionResult> GetNutritionists()
    {
        var result = await _consultationService.GetNutritionistsAsync();
        return SuccessResp.Ok(result, "Lấy danh sách chuyên gia dinh dưỡng thành công");
    }

    /// <summary>
    /// Hội viên đặt lịch hẹn tư vấn mới với chuyên gia
    /// </summary>
    [HttpPost("book")]
    public async Task<IActionResult> BookSession([FromBody] BookConsultationDto dto)
    {
        var result = await _consultationService.BookSessionAsync(dto);
        return SuccessResp.Created(result, "Đặt lịch tư vấn với chuyên gia thành công");
    }

    /// <summary>
    /// Hội viên xem toàn bộ danh sách lịch hẹn của mình
    /// </summary>
    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserSessions(Guid userId)
    {
        var result = await _consultationService.GetUserSessionsAsync(userId);
        return SuccessResp.Ok(result, "Lấy danh sách lịch hẹn cá nhân thành công");
    }

    /// <summary>
    /// Hội viên xem danh sách các phiếu lời khuyên (Advice Notes) nhận được từ bác sĩ
    /// </summary>
    [HttpGet("user/{userId:guid}/advices")]
    public async Task<IActionResult> GetUserAdvices(Guid userId)
    {
        var result = await _consultationService.GetUserAdvicesAsync(userId);
        return SuccessResp.Ok(result, "Lấy danh sách phiếu lời khuyên thành công");
    }

    /// <summary>
    /// Bác sĩ xem danh sách các buổi hẹn tư vấn của mình
    /// </summary>
    [HttpGet("nutritionist/{nutritionistId:guid}")]
    public async Task<IActionResult> GetNutritionistSessions(Guid nutritionistId)
    {
        var result = await _consultationService.GetNutritionistSessionsAsync(nutritionistId);
        return SuccessResp.Ok(result, "Lấy lịch làm việc của bác sĩ thành công");
    }

    /// <summary>
    /// Bác sĩ gửi phiếu lời khuyên dinh dưỡng cho hội viên (tự động bắn RabbitMQ sang Notification Service)
    /// </summary>
    [HttpPost("advice")]
    public async Task<IActionResult> SendAdvice([FromBody] SendAdviceDto dto)
    {
        var result = await _consultationService.SendAdviceAsync(dto);
        return SuccessResp.Created(result, "Gửi phiếu lời khuyên thành công và đã kích hoạt thông báo qua RabbitMQ");
    }

    /// <summary>
    /// Bác sĩ truy vấn snapshot sức khỏe của hội viên (gRPC Sync sang Diet & Fasting Service cổng 7002)
    /// </summary>
    [HttpGet("review-user/{userId:guid}")]
    public async Task<IActionResult> ReviewUserProgress(Guid userId)
    {
        var result = await _consultationService.ReviewUserDietProgressAsync(userId);
        return SuccessResp.Ok(result, "Truy vấn snapshot tiến độ dinh dưỡng qua gRPC thành công");
    }
}

