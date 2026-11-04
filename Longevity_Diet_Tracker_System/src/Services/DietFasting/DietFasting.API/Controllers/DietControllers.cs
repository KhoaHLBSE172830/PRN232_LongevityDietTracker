using BuildingBlocks.Common.ResponseCode;
using DietFasting.Application.DTOs;
using DietFasting.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace DietFasting.API.Controllers;

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
        return SuccessResp.Created(result, "Meal logged successfully");
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserMeals(Guid userId, [FromQuery] DateTime? date)
    {
        var queryDate = date ?? DateTime.UtcNow;
        var result = await _mealService.GetUserMealsAsync(userId, queryDate);
        return SuccessResp.Ok(result);
    }
}

[ApiController]
[Route("api/[controller]")]
public class FastingController : ControllerBase
{
    private readonly IFastingService _fastingService;

    public FastingController(IFastingService fastingService)
    {
        _fastingService = fastingService;
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartFasting([FromBody] StartFastingRequestDto dto)
    {
        var result = await _fastingService.StartFastingAsync(dto);
        return SuccessResp.Created(result, "Fasting session started successfully");
    }

    [HttpPost("{sessionId:guid}/end")]
    public async Task<IActionResult> EndFasting(Guid sessionId)
    {
        var result = await _fastingService.EndFastingAsync(sessionId);
        return SuccessResp.Ok(result, "Fasting session completed successfully");
    }

    [HttpGet("user/{userId:guid}/active")]
    public async Task<IActionResult> GetActiveSession(Guid userId)
    {
        var result = await _fastingService.GetActiveFastingSessionAsync(userId);
        return SuccessResp.Ok(result);
    }
}

[ApiController]
[Route("api/[controller]")]
public class FmdController : ControllerBase
{
    private readonly IFmdService _fmdService;

    public FmdController(IFmdService fmdService)
    {
        _fmdService = fmdService;
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartCycle([FromBody] StartFmdCycleDto dto)
    {
        var result = await _fmdService.StartCycleAsync(dto);
        return SuccessResp.Created(result, "FMD 5-day cycle started successfully");
    }

    [HttpGet("user/{userId:guid}/active")]
    public async Task<IActionResult> GetActiveCycle(Guid userId)
    {
        var result = await _fmdService.GetActiveCycleAsync(userId);
        return SuccessResp.Ok(result);
    }
}

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
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return ErrorResp.BadRequest("Search query cannot be empty");

        var result = await _nutritionService.SearchFoodItemsAsync(q);
        return SuccessResp.Ok(result);
    }
}
