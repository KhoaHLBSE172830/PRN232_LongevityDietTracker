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

    // Chỉ chủ tài khoản hoặc Admin được xem/sửa hồ sơ.
    private void EnsureOwnerOrAdmin(Guid id)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (User.IsInRole("Admin")) return;
        if (!Guid.TryParse(claim, out var callerId) || callerId != id)
            throw new ForbiddenException("Bạn chỉ được truy cập hồ sơ của chính mình.");
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
