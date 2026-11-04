using System.Security.Cryptography;
using System.Text;
using BuildingBlocks.Common.Exceptions;
using BuildingBlocks.Common.Repositories;
using Identity.Application.DTOs;
using Identity.Domain.Entities;
using Identity.Domain.Exceptions;

namespace Identity.Application.Services;

public class AuthService : IAuthService
{
    private readonly Repositories.IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;
    private readonly IGoogleAuthService _googleAuthService;

    public AuthService(
        Repositories.IUserRepository userRepository,
        IUnitOfWork unitOfWork,
        IJwtService jwtService,
        IGoogleAuthService googleAuthService)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
        _googleAuthService = googleAuthService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
    {
        var existing = await _userRepository.GetByEmailAsync(request.Email.ToLowerInvariant());
        if (existing != null)
            throw new EmailAlreadyExistsException(request.Email);

        var user = new User(request.Email.ToLowerInvariant(), request.FullName, request.Role)
        {
            PasswordHash = HashPassword(request.Password)
        };

        var refreshToken = _jwtService.GenerateRefreshToken(user.Id);
        user.RefreshTokens.Add(refreshToken);

        await _userRepository.CreateAsync(user);
        await _unitOfWork.SaveChangesAsync();

        var accessToken = _jwtService.GenerateAccessToken(user);

        return new AuthResponseDto(
            user.Id,
            user.Email,
            user.FullName,
            user.Role.ToString(),
            accessToken,
            refreshToken.Token,
            refreshToken.ExpiresAtUtc);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email.ToLowerInvariant());
        if (user == null || user.PasswordHash == null || !VerifyPassword(request.Password, user.PasswordHash))
            throw new InvalidCredentialsException();

        var refreshToken = _jwtService.GenerateRefreshToken(user.Id);
        user.RefreshTokens.Add(refreshToken);
        await _unitOfWork.SaveChangesAsync();

        var accessToken = _jwtService.GenerateAccessToken(user);

        return new AuthResponseDto(
            user.Id,
            user.Email,
            user.FullName,
            user.Role.ToString(),
            accessToken,
            refreshToken.Token,
            refreshToken.ExpiresAtUtc);
    }

    public async Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginRequestDto request)
    {
        var (email, fullName, googleId) = await _googleAuthService.VerifyGoogleTokenAsync(request.IdToken);

        var user = await _userRepository.GetByEmailAsync(email.ToLowerInvariant());
        if (user == null)
        {
            user = new User(email.ToLowerInvariant(), fullName, Domain.Enums.UserRole.User, googleId);
            await _userRepository.CreateAsync(user);
        }

        var refreshToken = _jwtService.GenerateRefreshToken(user.Id);
        user.RefreshTokens.Add(refreshToken);
        await _unitOfWork.SaveChangesAsync();

        var accessToken = _jwtService.GenerateAccessToken(user);

        return new AuthResponseDto(
            user.Id,
            user.Email,
            user.FullName,
            user.Role.ToString(),
            accessToken,
            refreshToken.Token,
            refreshToken.ExpiresAtUtc);
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequestDto request)
    {
        var user = await _userRepository.FirstOrDefaultAsync(
            u => u.RefreshTokens.Any(r => r.Token == request.RefreshToken && !r.IsRevoked));

        if (user == null)
            throw new UnauthorizedException("Invalid or revoked refresh token.");

        var activeToken = user.RefreshTokens.FirstOrDefault(r => r.Token == request.RefreshToken && r.IsActive);
        if (activeToken == null)
            throw new UnauthorizedException("Refresh token is expired or revoked.");

        activeToken.IsRevoked = true;
        var newRefreshToken = _jwtService.GenerateRefreshToken(user.Id);
        activeToken.ReplacedByToken = newRefreshToken.Token;
        user.RefreshTokens.Add(newRefreshToken);

        await _unitOfWork.SaveChangesAsync();

        var accessToken = _jwtService.GenerateAccessToken(user);

        return new AuthResponseDto(
            user.Id,
            user.Email,
            user.FullName,
            user.Role.ToString(),
            accessToken,
            newRefreshToken.Token,
            newRefreshToken.ExpiresAtUtc);
    }

    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(bytes);
    }

    private static bool VerifyPassword(string password, string hash)
    {
        return HashPassword(password) == hash;
    }
}

public class UserService : IUserService
{
    private readonly Repositories.IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UserService(Repositories.IUserRepository userRepository, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<UserProfileDto> GetProfileAsync(Guid userId)
    {
        var user = await _userRepository.GetWithProfileAsync(userId);
        if (user == null)
            throw new UserNotFoundException(userId.ToString());

        var profile = user.Profile;
        return new UserProfileDto(
            userId,
            profile?.DateOfBirth,
            profile?.Gender,
            profile?.HeightCm,
            profile?.CurrentWeightKg,
            profile?.TargetWeightKg,
            profile?.DietaryPreference,
            profile?.HealthGoals);
    }

    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UserProfileDto profileDto)
    {
        var user = await _userRepository.GetWithProfileAsync(userId);
        if (user == null)
            throw new UserNotFoundException(userId.ToString());

        if (user.Profile == null)
        {
            user.Profile = new UserProfile
            {
                UserId = userId
            };
        }

        user.Profile.DateOfBirth = profileDto.DateOfBirth;
        user.Profile.Gender = profileDto.Gender;
        user.Profile.HeightCm = profileDto.HeightCm;
        user.Profile.CurrentWeightKg = profileDto.CurrentWeightKg;
        user.Profile.TargetWeightKg = profileDto.TargetWeightKg;
        user.Profile.DietaryPreference = profileDto.DietaryPreference;
        user.Profile.HealthGoals = profileDto.HealthGoals;
        user.Profile.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return profileDto;
    }
}

