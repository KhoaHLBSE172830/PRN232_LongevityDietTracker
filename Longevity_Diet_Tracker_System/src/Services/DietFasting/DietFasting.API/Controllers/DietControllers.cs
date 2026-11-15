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

    // Chủ bữa ăn luôn là người dùng trong JWT, không tin UserId client gửi lên.
    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id
            : throw new UnauthorizedException("Token does not contain a valid user id.");

    [HttpPost]
    public async Task<IActionResult> LogMeal([FromBody] CreateMealLogDto dto)
    {
        var result = await _mealService.LogMealAsync(dto with { UserId = CurrentUserId });
        return SuccessResp.Created(result, "Meal logged successfully (Blue Zones compliant)");
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserMeals(Guid userId, [FromQuery] DateTime? date, [FromQuery] int utcOffsetMinutes = 0)
    {
        if (userId != CurrentUserId && !User.IsInRole("Admin"))
            throw new ForbiddenException("Bạn chỉ được xem bữa ăn của chính mình.");

        var queryDate = date ?? DateTime.UtcNow;
        var result = await _mealService.GetUserMealsAsync(userId, queryDate, utcOffsetMinutes);
        return SuccessResp.Ok(result);
    }

    [HttpPut("{mealId:guid}")]
    public async Task<IActionResult> UpdateMeal(Guid mealId, [FromBody] UpdateMealLogDto dto)
    {
        var result = await _mealService.UpdateMealAsync(mealId, CurrentUserId, User.IsInRole("Admin"), dto);
        return SuccessResp.Ok(result, "Meal updated successfully");
    }

    [HttpDelete("{mealId:guid}")]
    public async Task<IActionResult> DeleteMeal(Guid mealId)
    {
        await _mealService.DeleteMealAsync(mealId, CurrentUserId, User.IsInRole("Admin"));
        return SuccessResp.Ok<object?>(null, "Meal deleted successfully");
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

    [HttpPost("{sessionId:guid}/pause")]
    public async Task<IActionResult> PauseFasting(Guid sessionId, CancellationToken cancellationToken)
    {
        var result = await _fastingService.PauseFastingAsync(sessionId, CurrentUserId, cancellationToken);
        return SuccessResp.Ok(result, "Fasting session paused");
    }

    [HttpPost("{sessionId:guid}/resume")]
    public async Task<IActionResult> ResumeFasting(Guid sessionId, CancellationToken cancellationToken)
    {
        var result = await _fastingService.ResumeFastingAsync(sessionId, CurrentUserId, cancellationToken);
        return SuccessResp.Ok(result, "Fasting session resumed");
    }

    [HttpGet("user/{userId:guid}/history")]
    public async Task<IActionResult> GetHistory(Guid userId, [FromQuery] int limit = 30, CancellationToken cancellationToken = default)
    {
        if (userId != CurrentUserId)
            throw new ForbiddenException("You can only view your own fasting history.");

        var result = await _fastingService.GetHistoryAsync(userId, limit, cancellationToken);
        return SuccessResp.Ok(result);
    }

    [HttpGet("user/{userId:guid}/stats")]
    public async Task<IActionResult> GetStats(Guid userId, CancellationToken cancellationToken)
    {
        if (userId != CurrentUserId)
            throw new ForbiddenException("You can only view your own fasting stats.");

        var result = await _fastingService.GetStatsAsync(userId, cancellationToken);
        return SuccessResp.Ok(result);
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

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id
            : throw new UnauthorizedException("Token does not contain a valid user id.");

    private void EnsureOwnerOrAdmin(Guid userId)
    {
        if (userId != CurrentUserId && !User.IsInRole("Admin"))
            throw new ForbiddenException("Bạn chỉ được xem chu kỳ FMD của chính mình.");
    }

    [HttpGet("user/{userId:guid}/active")]
    public async Task<IActionResult> GetActiveCycle(Guid userId)
    {
        EnsureOwnerOrAdmin(userId);
        var result = await _fmdService.GetActiveCycleAsync(userId);
        return SuccessResp.Ok(result);
    }

    [HttpGet("user/{userId:guid}/history")]
    public async Task<IActionResult> GetHistory(Guid userId)
    {
        EnsureOwnerOrAdmin(userId);
        var result = await _fmdService.GetHistoryAsync(userId);
        return SuccessResp.Ok(result);
    }

    [HttpPost("{cycleId:guid}/cancel")]
    public async Task<IActionResult> CancelCycle(Guid cycleId)
    {
        var result = await _fmdService.CancelCycleAsync(cycleId, CurrentUserId, User.IsInRole("Admin"));
        return SuccessResp.Ok(result, "FMD cycle cancelled");
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
    private readonly IMealService _mealService;

    public MealTemplatesController(IMealTemplateService templateService, IMealService mealService)
    {
        _templateService = templateService;
        _mealService = mealService;
    }

    /// <summary>Ghi một mẫu bữa ăn vào nhật ký của người dùng đang đăng nhập.</summary>
    [HttpPost("{id:guid}/apply")]
    public async Task<IActionResult> ApplyTemplate(Guid id, [FromBody] ApplyMealTemplateDto dto)
    {
        var userId = Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var uid)
            ? uid
            : throw new UnauthorizedException("Token does not contain a valid user id.");
        var template = await _templateService.GetTemplateByIdAsync(id);
        var meal = await _mealService.LogMealFromTemplateAsync(userId, template, dto);
        return SuccessResp.Created(meal, "Meal logged from template");
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


/// <summary>Thói quen sống khỏe: nước uống và vận động theo ngày (chỉ chủ hoặc Admin).</summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class HabitsController : ControllerBase
{
    private readonly IHabitService _habitService;

    public HabitsController(IHabitService habitService)
    {
        _habitService = habitService;
    }

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id
            : throw new UnauthorizedException("Token does not contain a valid user id.");

    private void EnsureOwnerOrAdmin(Guid userId)
    {
        if (userId != CurrentUserId && !User.IsInRole("Admin"))
            throw new ForbiddenException("Bạn chỉ được truy cập thói quen của chính mình.");
    }

    private static DateOnly Today(DateOnly? date) => date ?? DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetDay(Guid userId, [FromQuery] DateOnly? date)
    {
        EnsureOwnerOrAdmin(userId);
        return SuccessResp.Ok(await _habitService.GetDayAsync(userId, Today(date)));
    }

    [HttpPut("user/{userId:guid}")]
    public async Task<IActionResult> SetDay(Guid userId, [FromBody] SetHabitDto dto, [FromQuery] DateOnly? date)
    {
        EnsureOwnerOrAdmin(userId);
        return SuccessResp.Ok(await _habitService.SetDayAsync(userId, Today(date), dto), "Habit updated");
    }

    [HttpPost("user/{userId:guid}/add")]
    public async Task<IActionResult> AddToDay(Guid userId, [FromBody] AddHabitDto dto, [FromQuery] DateOnly? date)
    {
        EnsureOwnerOrAdmin(userId);
        return SuccessResp.Ok(await _habitService.AddToDayAsync(userId, Today(date), dto), "Habit updated");
    }

    [HttpGet("user/{userId:guid}/range")]
    public async Task<IActionResult> GetRange(Guid userId, [FromQuery] DateOnly from, [FromQuery] DateOnly to)
    {
        EnsureOwnerOrAdmin(userId);
        return SuccessResp.Ok(await _habitService.GetRangeAsync(userId, from, to));
    }
}
