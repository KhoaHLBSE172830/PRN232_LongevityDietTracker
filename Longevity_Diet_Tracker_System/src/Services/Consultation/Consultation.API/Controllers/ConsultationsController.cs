using BuildingBlocks.Common.ResponseCode;
using Consultation.Application.DTOs;
using Consultation.Application.Services;
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

    [HttpPost("book")]
    public async Task<IActionResult> BookSession([FromBody] BookConsultationDto dto)
    {
        var result = await _consultationService.BookSessionAsync(dto);
        return SuccessResp.Created(result, "Consultation session booked successfully");
    }

    [HttpGet("nutritionist/{nutritionistId:guid}")]
    public async Task<IActionResult> GetNutritionistSessions(Guid nutritionistId)
    {
        var result = await _consultationService.GetNutritionistSessionsAsync(nutritionistId);
        return SuccessResp.Ok(result);
    }

    [HttpPost("advice")]
    public async Task<IActionResult> SendAdvice([FromBody] SendAdviceDto dto)
    {
        var result = await _consultationService.SendAdviceAsync(dto);
        return SuccessResp.Created(result, "Advice sent to user successfully");
    }

    [HttpGet("review-user/{userId:guid}")]
    public async Task<IActionResult> ReviewUserProgress(Guid userId)
    {
        var result = await _consultationService.ReviewUserDietProgressAsync(userId);
        return SuccessResp.Ok(result);
    }
}
