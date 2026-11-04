using Identity.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Identity.Infrastructure.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(u => u.Id);
        builder.HasIndex(u => u.Email).IsUnique();
        builder.Property(u => u.Email).HasMaxLength(256).IsRequired();
        builder.Property(u => u.FullName).HasMaxLength(256).IsRequired();

        builder.HasOne(u => u.Profile)
               .WithOne(p => p.User)
               .HasForeignKey<UserProfile>(p => p.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(u => u.RefreshTokens)
               .WithOne(r => r.User)
               .HasForeignKey(r => r.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("refresh_tokens");
        builder.HasKey(r => r.Id);
        builder.HasIndex(r => r.Token).IsUnique();
    }
}

public class UserProfileConfiguration : IEntityTypeConfiguration<UserProfile>
{
    public void Configure(EntityTypeBuilder<UserProfile> builder)
    {
        builder.ToTable("user_profiles");
        builder.HasKey(p => p.Id);
    }
}

