using BuildingBlocks.Common.ResponseCode;
using Identity.Application.DTOs;
using Identity.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace Identity.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("{id:guid}/profile")]
    public async Task<IActionResult> GetProfile(Guid id)
    {
        var profile = await _userService.GetProfileAsync(id);
        return SuccessResp.Ok(profile);
    }

    [HttpPut("{id:guid}/profile")]
    public async Task<IActionResult> UpdateProfile(Guid id, [FromBody] UserProfileDto dto)
    {
        var updated = await _userService.UpdateProfileAsync(id, dto);
        return SuccessResp.Ok(updated, "Profile updated successfully");
    }
}
