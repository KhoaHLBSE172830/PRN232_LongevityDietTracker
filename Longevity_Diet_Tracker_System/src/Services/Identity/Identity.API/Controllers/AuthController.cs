using BuildingBlocks.Common.ResponseCode;
using Identity.Application.DTOs;
using Identity.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace Identity.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
    {
        var result = await _authService.RegisterAsync(request);
        return SuccessResp.Created(result, "User registered successfully");
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        var result = await _authService.LoginAsync(request);
        return SuccessResp.Ok(result, "Login successful");
    }

    [HttpPost("google-login")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequestDto request)
    {
        var result = await _authService.GoogleLoginAsync(request);
        return SuccessResp.Ok(result, "Google login successful");
    }

    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto request)
    {
        var result = await _authService.RefreshTokenAsync(request);
        return SuccessResp.Ok(result, "Token refreshed successfully");
    }
}
