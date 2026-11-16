using BuildingBlocks.Common.Entities;
using Identity.Domain.Enums;

namespace Identity.Domain.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public string? GoogleId { get; set; }
    public bool IsEmailVerified { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public UserProfile? Profile { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public User() { }

    public User(string email, string fullName, UserRole role = UserRole.User, string? googleId = null)
    {
        Email = email;
        FullName = fullName;
        Role = role;
        GoogleId = googleId;
        IsEmailVerified = !string.IsNullOrEmpty(googleId);
    }

    public void AddRefreshToken(string token, string jwtId, DateTime expiresAt)
    {
        RefreshTokens.Add(new RefreshToken
        {
            UserId = Id,
            Token = token,
            JwtId = jwtId,
            ExpiresAtUtc = expiresAt
        });
        UpdatedAt = DateTime.UtcNow;
    }

    public void RevokeRefreshToken(string token)
    {
        var existing = RefreshTokens.FirstOrDefault(r => r.Token == token);
        if (existing != null)
        {
            existing.IsRevoked = true;
            existing.UpdatedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }
    }

    public void VerifyEmail()
    {
        IsEmailVerified = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }
}
