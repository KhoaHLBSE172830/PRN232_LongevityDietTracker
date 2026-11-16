using System.Security.Claims;
using BuildingBlocks.Common.Exceptions;
using BuildingBlocks.Common.ResponseCode;
using Identity.Application.DTOs;
using Identity.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Identity.API.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IUserService _userService;

    public AdminController(IUserService userService)
    {
        _userService = userService;
    }

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id
            : throw new UnauthorizedException("Token does not contain a valid user id.");

    /// <summary>Admin liệt kê danh sách người dùng hệ thống (hỗ trợ phân trang, tìm kiếm email/tên, lọc theo vai trò và trạng thái hoạt động).</summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] UserQueryParameters query)
    {
        var result = await _userService.GetUsersPagedAsync(query);
        return SuccessResp.Ok(result);
    }

    /// <summary>Admin khóa hoặc mở khóa tài khoản người dùng. Nếu khóa, mọi phiên đăng nhập (Refresh Token) sẽ bị thu hồi ngay.</summary>
    [HttpPut("users/{id:guid}/status")]
    public async Task<IActionResult> SetUserStatus(Guid id, [FromBody] SetUserStatusRequestDto dto)
    {
        var result = await _userService.SetUserStatusAsync(CurrentUserId, id, dto);
        return SuccessResp.Ok(result, result.Message);
    }

    /// <summary>Admin xem thống kê tổng quan (Dashboard / Management) người dùng, tốc độ tăng trưởng và hồ sơ dinh dưỡng Blue Zones.</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _userService.GetAdminStatsAsync();
        return SuccessResp.Ok(stats);
    }

    /// <summary>Alias cho Admin Dashboard overview stats.</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var stats = await _userService.GetAdminStatsAsync();
        return SuccessResp.Ok(stats);
    }
}

