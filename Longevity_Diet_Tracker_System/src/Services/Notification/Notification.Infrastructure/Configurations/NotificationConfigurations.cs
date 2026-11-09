using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Notification.Domain.Entities;

namespace Notification.Infrastructure.Configurations;

public class NotificationLogConfiguration : IEntityTypeConfiguration<NotificationLog>
{
    public void Configure(EntityTypeBuilder<NotificationLog> builder)
    {
        builder.ToTable("notification_logs");
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Recipient).HasMaxLength(255).IsRequired();
        builder.Property(n => n.Subject).HasMaxLength(255).IsRequired();
        builder.Property(n => n.Body).IsRequired();
        builder.Property(n => n.Channel).HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(n => n.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(n => n.EventId).HasMaxLength(150);

        builder.HasIndex(n => new { n.UserId, n.CreatedAt });
        // AGENT.md Warning 5: Fast index for Idempotency verification
        builder.HasIndex(n => n.EventId);
    }
}

public class NotificationPreferenceConfiguration : IEntityTypeConfiguration<NotificationPreference>
{
    public void Configure(EntityTypeBuilder<NotificationPreference> builder)
    {
        builder.ToTable("notification_preferences");
        builder.HasKey(p => p.Id);
        builder.HasIndex(p => p.UserId).IsUnique();
    }
}
