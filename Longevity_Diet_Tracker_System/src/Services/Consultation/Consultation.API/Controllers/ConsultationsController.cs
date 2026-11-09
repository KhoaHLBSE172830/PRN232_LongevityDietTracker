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

    [HttpPost("book")]
    public async Task<IActionResult> BookSession([FromBody] BookConsultationDto dto)
    {
        var result = await _consultationService.BookSessionAsync(dto);
        return SuccessResp.Created(result, "Consultation session booked successfully");
    }

    [Authorize(Roles = "Nutritionist,Admin")]
    [HttpGet("nutritionist/{nutritionistId:guid}")]
    public async Task<IActionResult> GetNutritionistSessions(Guid nutritionistId)
    {
        var result = await _consultationService.GetNutritionistSessionsAsync(nutritionistId);
        return SuccessResp.Ok(result);
    }

    [Authorize(Roles = "Nutritionist,Admin")]
    [HttpPost("advice")]
    public async Task<IActionResult> SendAdvice([FromBody] SendAdviceDto dto)
    {
        var result = await _consultationService.SendAdviceAsync(dto);
        return SuccessResp.Created(result, "Advice note sent to user successfully and published to RabbitMQ");
    }

    [Authorize(Roles = "Nutritionist,Admin")]
    [HttpGet("review-user/{userId:guid}")]
    public async Task<IActionResult> ReviewUserProgress(Guid userId)
    {
        var result = await _consultationService.ReviewUserDietProgressAsync(userId);
        return SuccessResp.Ok(result);
    }
}
