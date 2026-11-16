using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using BuildingBlocks.Common.Exceptions;
using BuildingBlocks.Common.Repositories;
using BuildingBlocks.Messaging.Abstractions;
using BuildingBlocks.Messaging.Events;
using Identity.Application.DTOs;
using Identity.Application.Security;
using Identity.Domain.Entities;
using Identity.Domain.Exceptions;
using Microsoft.Extensions.Logging;

namespace Identity.Application.Services;

public class AuthService : IAuthService
{
    private readonly Repositories.IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtService _jwtService;
    private readonly IGoogleAuthService _googleAuthService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEventBus? _eventBus;
    private readonly ILogger<AuthService>? _logger;

    public AuthService(
        Repositories.IUserRepository userRepository,
        IUnitOfWork unitOfWork,
        IJwtService jwtService,
        IGoogleAuthService googleAuthService,
        IPasswordHasher passwordHasher,
        IEventBus? eventBus = null,
        ILogger<AuthService>? logger = null)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _jwtService = jwtService;
        _googleAuthService = googleAuthService;
        _passwordHasher = passwordHasher;
        _eventBus = eventBus;
        _logger = logger;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !Regex.IsMatch(request.Email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            throw new BadRequestException("Địa chỉ email không đúng định dạng hợp lệ.");

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            throw new BadRequestException("Mật khẩu phải có độ dài tối thiểu từ 6 ký tự trở lên.");

        if (string.IsNullOrWhiteSpace(request.FullName))
            throw new BadRequestException("Họ và tên không được để trống.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var existing = await _userRepository.GetByEmailAsync(normalizedEmail);
        if (existing != null)
            throw new EmailAlreadyExistsException(request.Email);

        var user = new User(normalizedEmail, request.FullName.Trim(), Domain.Enums.UserRole.User)
        {
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            IsActive = true,
            IsEmailVerified = false
        };

        var refreshToken = _jwtService.GenerateRefreshToken(user.Id);
        user.RefreshTokens.Add(refreshToken);

        await _userRepository.CreateAsync(user);
        await _unitOfWork.SaveChangesAsync();

        // Event-driven publish to RabbitMQ for asynchronous Notification service processing
        if (_eventBus != null)
        {
            try
            {
                await _eventBus.PublishAsync(new UserRegisteredIntegrationEvent(
                    user.Id,
                    user.Email,
                    user.FullName,
                    user.Role.ToString()));
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Could not publish UserRegisteredIntegrationEvent for {Email}", user.Email);
            }
        }

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
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            throw new InvalidCredentialsException();

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(normalizedEmail);
        if (user == null || user.PasswordHash == null || !_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
            throw new InvalidCredentialsException();

        if (!user.IsActive)
            throw new ForbiddenException("Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ quản trị viên.");

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

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(normalizedEmail);
        if (user == null)
        {
            user = new User(normalizedEmail, fullName, Domain.Enums.UserRole.User, googleId);
            await _userRepository.CreateAsync(user);
        }
        else if (!user.IsActive)
        {
            throw new ForbiddenException("Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ quản trị viên.");
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

        if (!user.IsActive)
            throw new ForbiddenException("Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ quản trị viên.");

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
            profile?.HealthGoals,
            profile?.DailyCalorieTarget,
            profile?.ProteinPercent,
            profile?.CarbsPercent,
            profile?.FatPercent,
            profile?.PreferredFastingType,
            profile?.WaterReminderEnabled,
            profile?.EveningReminderEnabled);
    }

    public async Task SetRoleAsync(Guid userId, Domain.Enums.UserRole role)
    {
        var user = await _userRepository.GetWithProfileAsync(userId);
        if (user == null)
            throw new UserNotFoundException(userId.ToString());
        user.Role = role;
        user.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
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

        if (profileDto.DailyCalorieTarget is < 800 or > 5000)
            throw new BadRequestException("DailyCalorieTarget must be between 800 and 5000.");
        var p = profileDto.ProteinPercent;
        var c = profileDto.CarbsPercent;
        var f = profileDto.FatPercent;
        if ((p.HasValue || c.HasValue || f.HasValue) && (p ?? 0) + (c ?? 0) + (f ?? 0) != 100)
            throw new BadRequestException("Protein/Carbs/Fat percentages must add up to 100.");
        user.Profile.DailyCalorieTarget = profileDto.DailyCalorieTarget;
        user.Profile.ProteinPercent = p;
        user.Profile.CarbsPercent = c;
        user.Profile.FatPercent = f;
        user.Profile.PreferredFastingType = profileDto.PreferredFastingType;
        user.Profile.WaterReminderEnabled = profileDto.WaterReminderEnabled ?? false;
        user.Profile.EveningReminderEnabled = profileDto.EveningReminderEnabled ?? false;
        user.Profile.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        return profileDto;
    }

    public async Task<PagedResultDto<UserSummaryDto>> GetUsersPagedAsync(UserQueryParameters query)
    {
        var (users, totalCount) = await _userRepository.GetUsersPagedAsync(
            query.PageNumber,
            query.PageSize,
            query.SearchTerm,
            query.Role,
            query.IsActive);

        var summaries = users.Select(u => new UserSummaryDto(
            u.Id,
            u.Email,
            u.FullName,
            u.Role.ToString(),
            u.IsActive,
            u.IsEmailVerified,
            GoogleLinked: !string.IsNullOrEmpty(u.GoogleId),
            u.CreatedAt,
            u.UpdatedAt,
            HasProfile: u.Profile != null,
            DietaryPreference: u.Profile?.DietaryPreference,
            PreferredFastingType: u.Profile?.PreferredFastingType,
            DailyCalorieTarget: u.Profile?.DailyCalorieTarget
        )).ToList();

        return PagedResultDto<UserSummaryDto>.Create(summaries, totalCount, query.PageNumber, query.PageSize);
    }

    public async Task<UserStatusResponseDto> SetUserStatusAsync(Guid currentAdminId, Guid targetUserId, SetUserStatusRequestDto request)
    {
        // 1. Business Invariant: Admin cannot lock their own active account
        if (currentAdminId == targetUserId && !request.IsActive)
        {
            throw new BadRequestException("Bạn không thể tự khóa tài khoản quản trị của chính mình.");
        }

        var user = await _userRepository.GetWithRefreshTokensAsync(targetUserId);
        if (user == null)
            throw new UserNotFoundException(targetUserId.ToString());

        // 2. Business Invariant: Default Super Admin cannot be locked by other admins
        if (user.Email.Equals("admin@longevitytracker.com", StringComparison.OrdinalIgnoreCase) && !request.IsActive)
        {
            throw new BadRequestException("Không thể khóa tài khoản quản trị viên hệ thống mặc định (Super Admin).");
        }

        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        // 3. Security Rule: If locking/deactivating user, invalidate all active refresh tokens immediately
        if (!request.IsActive)
        {
            foreach (var token in user.RefreshTokens.Where(r => !r.IsRevoked))
            {
                token.IsRevoked = true;
                token.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _unitOfWork.SaveChangesAsync();

        var message = request.IsActive 
            ? $"Tài khoản {user.Email} đã được mở khóa thành công."
            : $"Tài khoản {user.Email} đã bị khóa. Toàn bộ phiên đăng nhập đã được thu hồi.";

        return new UserStatusResponseDto(
            user.Id,
            user.Email,
            user.FullName,
            user.IsActive,
            user.UpdatedAt ?? DateTime.UtcNow,
            message
        );
    }

    public async Task<AdminDashboardStatsDto> GetAdminStatsAsync()
    {
        return await _userRepository.GetDashboardStatsAsync();
    }
}

