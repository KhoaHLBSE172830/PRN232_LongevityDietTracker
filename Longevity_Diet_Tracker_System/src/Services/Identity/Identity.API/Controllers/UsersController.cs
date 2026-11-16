using System.Security.Claims;
using BuildingBlocks.Common.Exceptions;
using BuildingBlocks.Common.ResponseCode;
using Identity.Application.DTOs;
using Identity.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Identity.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    private Guid CurrentUserId =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)
            ? id
            : throw new UnauthorizedException("Token does not contain a valid user id.");

    // Chỉ chủ tài khoản hoặc Admin được xem/sửa hồ sơ.
    private void EnsureOwnerOrAdmin(Guid id)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (User.IsInRole("Admin")) return;
        if (!Guid.TryParse(claim, out var callerId) || callerId != id)
            throw new ForbiddenException("Bạn chỉ được truy cập hồ sơ của chính mình.");
    }

    /// <summary>Admin liệt kê danh sách người dùng hệ thống (phân trang, tìm kiếm, lọc theo vai trò và trạng thái hoạt động).</summary>
    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] UserQueryParameters query)
    {
        var result = await _userService.GetUsersPagedAsync(query);
        return SuccessResp.Ok(result);
    }

    /// <summary>Admin xem thống kê tổng quan (Dashboard / Management) người dùng và hồ sơ sống khỏe Blue Zones.</summary>
    [Authorize(Roles = "Admin")]
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _userService.GetAdminStatsAsync();
        return SuccessResp.Ok(stats);
    }

    /// <summary>Admin khóa hoặc mở khóa tài khoản người dùng. Khi khóa tài khoản, toàn bộ Refresh Token sẽ bị thu hồi ngay lập tức.</summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> SetUserStatus(Guid id, [FromBody] SetUserStatusRequestDto dto)
    {
        var result = await _userService.SetUserStatusAsync(CurrentUserId, id, dto);
        return SuccessResp.Ok(result, result.Message);
    }

    [HttpGet("{id:guid}/profile")]
    public async Task<IActionResult> GetProfile(Guid id)
    {
        EnsureOwnerOrAdmin(id);
        var profile = await _userService.GetProfileAsync(id);
        return SuccessResp.Ok(profile);
    }

    [HttpPut("{id:guid}/profile")]
    public async Task<IActionResult> UpdateProfile(Guid id, [FromBody] UserProfileDto dto)
    {
        EnsureOwnerOrAdmin(id);
        var updated = await _userService.UpdateProfileAsync(id, dto);
        return SuccessResp.Ok(updated, "Profile updated successfully");
    }

    /// <summary>Admin cấp vai trò (vd. Nutritionist) cho tài khoản. Đăng ký tự do không thể tự chọn role.</summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}/role")]
    public async Task<IActionResult> SetRole(Guid id, [FromBody] UpdateRoleRequestDto dto)
    {
        if (!Enum.TryParse<Identity.Domain.Enums.UserRole>(dto.Role, ignoreCase: true, out var role) || !Enum.IsDefined(role))
            throw new BadRequestException("Role must be one of: User, Nutritionist, Admin.");

        await _userService.SetRoleAsync(id, role);
        return SuccessResp.Ok(new { userId = id, role = role.ToString() }, "Role updated successfully");
    }
}
