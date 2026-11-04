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
}
