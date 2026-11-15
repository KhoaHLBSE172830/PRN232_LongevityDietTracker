using System.Security.Claims;
using BuildingBlocks.Common.Exceptions;
using BuildingBlocks.Common.ResponseCode;
using DietFasting.Application.DTOs;
using DietFasting.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DietFasting.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MealsController : ControllerBase
{
    private readonly IMealService _mealService;

    public MealsController(IMealService mealService)
    {
        _mealService = mealService;
    }

    [HttpPost]
    public async Task<IActionResult> LogMeal([FromBody] CreateMealLogDto dto)
    {
        var result = await _mealService.LogMealAsync(dto);
        return SuccessResp.Created(result, "Meal logged successfully (Blue Zones compliant)");
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserMeals(Guid userId, [FromQuery] DateTime? date)
    {
        var queryDate = date ?? DateTime.UtcNow;
        var result = await _mealService.GetUserMealsAsync(userId, queryDate);
        return SuccessResp.Ok(result);
    }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FastingController : ControllerBase
{
    private readonly IFastingService _fastingService;

    public FastingController(IFastingService fastingService)
    {
        _fastingService = fastingService;
    }

    // AGENT.md 4.3: the owner is ALWAYS the authenticated user (JWT), never a value sent by the client.
    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id
            : throw new UnauthorizedException("Token does not contain a valid user id.");

    // Reminder e-mails go to the address in the JWT (Identity puts it there); Diet & Fasting cannot query Identity's database.
    private string? CurrentUserEmail =>
        User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");

    [HttpPost("start")]
    public async Task<IActionResult> StartFasting([FromBody] StartFastingRequestDto dto, CancellationToken cancellationToken)
    {
        var result = await _fastingService.StartFastingAsync(dto with { UserId = CurrentUserId }, CurrentUserEmail, cancellationToken);
        return SuccessResp.Created(result, "Fasting session started successfully");
    }

    [HttpPost("{sessionId:guid}/end")]
    public async Task<IActionResult> EndFasting(Guid sessionId, [FromBody] EndFastingRequestDto? dto, CancellationToken cancellationToken)
    {
        var result = await _fastingService.EndFastingAsync(sessionId, CurrentUserId, dto?.MoodNotes, cancellationToken);
        return SuccessResp.Ok(result, "Fasting session completed successfully");
    }

    [HttpPost("{sessionId:guid}/cancel")]
    public async Task<IActionResult> CancelFasting(Guid sessionId, [FromBody] CancelFastingRequestDto? dto, CancellationToken cancellationToken)
    {
        var result = await _fastingService.CancelFastingAsync(sessionId, CurrentUserId, dto?.Reason, cancellationToken);
        return SuccessResp.Ok(result, "Fasting session cancelled");
    }

    [HttpGet("user/{userId:guid}/active")]
    public async Task<IActionResult> GetActiveSession(Guid userId, CancellationToken cancellationToken)
    {
        if (userId != CurrentUserId)
            throw new ForbiddenException("You can only view your own fasting session.");

        var result = await _fastingService.GetActiveFastingSessionAsync(userId, cancellationToken);
        return SuccessResp.Ok(result);
    }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FmdController : ControllerBase
{
    private readonly IFmdService _fmdService;

    public FmdController(IFmdService fmdService)
    {
        _fmdService = fmdService;
    }

    private Guid ResolveUserId(Guid dtoUserId)
    {
        if (Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var jwtUserId))
            return jwtUserId;
        return dtoUserId;
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartCycle([FromBody] StartFmdCycleDto dto)
    {
        var effectiveDto = dto with { UserId = ResolveUserId(dto.UserId) };
        var result = await _fmdService.StartCycleAsync(effectiveDto);
        return SuccessResp.Created(result, "5-day Fasting Mimicking Diet (FMD) cycle started successfully");
    }

    [HttpGet("user/{userId:guid}/active")]
    public async Task<IActionResult> GetActiveCycle(Guid userId)
    {
        var result = await _fmdService.GetActiveCycleAsync(userId);
        return SuccessResp.Ok(result);
    }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NutritionController : ControllerBase
{
    private readonly INutritionService _nutritionService;

    public NutritionController(INutritionService nutritionService)
    {
        _nutritionService = nutritionService;
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string query)
    {
        var results = await _nutritionService.SearchFoodItemsAsync(query);
        return SuccessResp.Ok(results);
    }

    [HttpGet("details/{externalFoodId}")]
    public async Task<IActionResult> Details(string externalFoodId)
    {
        var item = await _nutritionService.GetFoodDetailsAsync(externalFoodId);
        return SuccessResp.Ok(item);
    }
}

// C0 Context & AGENT.md: Admin manages FMD rules & Meal Templates
[Authorize]
[ApiController]
[Route("api/admin/fmd-rules")]
public class FmdRulesController : ControllerBase
{
    private readonly IFmdRuleService _fmdRuleService;

    public FmdRulesController(IFmdRuleService fmdRuleService)
    {
        _fmdRuleService = fmdRuleService;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetAllRules()
    {
        var rules = await _fmdRuleService.GetAllRulesAsync();
        return SuccessResp.Ok(rules);
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{dayNumber:int}")]
    public async Task<IActionResult> UpdateRule(int dayNumber, [FromBody] UpdateFmdRuleRequest request)
    {
        var rule = await _fmdRuleService.UpdateRuleAsync(dayNumber, request);
        return SuccessResp.Ok(rule, $"FMD Rule for Day {dayNumber} updated successfully");
    }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MealTemplatesController : ControllerBase
{
    private readonly IMealTemplateService _templateService;

    public MealTemplatesController(IMealTemplateService templateService)
    {
        _templateService = templateService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllTemplates()
    {
        var templates = await _templateService.GetAllTemplatesAsync();
        return SuccessResp.Ok(templates);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var template = await _templateService.GetTemplateByIdAsync(id);
        return SuccessResp.Ok(template);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateMealTemplateRequest request)
    {
        var created = await _templateService.CreateTemplateAsync(request);
        return SuccessResp.Created(created, "Blue Zones meal template created successfully");
    }
}
