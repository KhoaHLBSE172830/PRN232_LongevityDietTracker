using Identity.Application.Repositories;
using Identity.Application.Security;
using Identity.Domain.Entities;
using Identity.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace Identity.Infrastructure.Database;

public interface IIdentityDataSeeder
{
    Task SeedAsync();
}

public class IdentityDataSeeder : IIdentityDataSeeder
{
    private readonly IUserRepository _userRepository;
    private readonly BuildingBlocks.Common.Repositories.IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger<IdentityDataSeeder> _logger;

    public IdentityDataSeeder(
        IUserRepository userRepository,
        BuildingBlocks.Common.Repositories.IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        ILogger<IdentityDataSeeder> logger)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            // 1. Seed Admin account
            await SeedUserAsync(
                "admin@longevitytracker.com",
                "System Administrator",
                UserRole.Admin,
                "Admin@123456");

            // 2. Seed Nutritionist account
            await SeedUserAsync(
                "nutritionist@longevitytracker.com",
                "Dr. Sarah BlueZones",
                UserRole.Nutritionist,
                "Nutritionist@123456");

            // 3. Seed regular demo User
            await SeedUserAsync(
                "user@longevitytracker.com",
                "John Centenarian",
                UserRole.User,
                "User@123456",
                profile =>
                {
                    profile.DateOfBirth = new DateTime(1990, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                    profile.Gender = "Male";
                    profile.HeightCm = 175;
                    profile.CurrentWeightKg = 70;
                    profile.TargetWeightKg = 68;
                    profile.DailyCalorieTarget = 2000;
                    profile.ProteinPercent = 15;
                    profile.CarbsPercent = 65;
                    profile.FatPercent = 20;
                    profile.PreferredFastingType = "16:8";
                    profile.DietaryPreference = "Plant-Slanted (Blue Zones)";
                    profile.HealthGoals = "Longevity, Autophagy, Metabolic Health";
                    profile.WaterReminderEnabled = true;
                    profile.EveningReminderEnabled = true;
                });

            await _unitOfWork.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while seeding default Identity data.");
        }
    }

    private async Task SeedUserAsync(
        string email,
        string fullName,
        UserRole role,
        string rawPassword,
        Action<UserProfile>? configureProfile = null)
    {
        var existing = await _userRepository.GetByEmailAsync(email.ToLowerInvariant());
        if (existing == null)
        {
            var user = new User(email.ToLowerInvariant(), fullName, role)
            {
                PasswordHash = _passwordHasher.HashPassword(rawPassword),
                IsActive = true,
                IsEmailVerified = true
            };

            if (configureProfile != null)
            {
                user.Profile = new UserProfile
                {
                    UserId = user.Id
                };
                configureProfile(user.Profile);
            }

            await _userRepository.CreateAsync(user);
            _logger.LogInformation("Seeded default {Role} account: {Email}", role, email);
        }
    }
}

