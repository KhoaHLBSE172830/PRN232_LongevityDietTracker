using DietFasting.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace DietFasting.Infrastructure.Configurations;

public class MealLogConfiguration : IEntityTypeConfiguration<MealLog>
{
    public void Configure(EntityTypeBuilder<MealLog> builder)
    {
        builder.ToTable("meal_logs");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.MealType).HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(m => m.Notes).HasMaxLength(500);
        builder.Property(m => m.ThresholdViolationNotes).HasMaxLength(500);

        builder.HasIndex(m => new { m.UserId, m.LoggedAt });

        builder.HasMany(m => m.FoodItems)
            .WithOne(f => f.MealLog)
            .HasForeignKey(f => f.MealLogId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class MealFoodItemConfiguration : IEntityTypeConfiguration<MealFoodItem>
{
    public void Configure(EntityTypeBuilder<MealFoodItem> builder)
    {
        builder.ToTable("meal_food_items");
        builder.HasKey(f => f.Id);
        builder.Property(f => f.ExternalFoodId).HasMaxLength(100).IsRequired();
        builder.Property(f => f.FoodName).HasMaxLength(255).IsRequired();
        builder.Property(f => f.ServingUnit).HasMaxLength(50).IsRequired();
    }
}

public class FastingSessionConfiguration : IEntityTypeConfiguration<FastingSession>
{
    public void Configure(EntityTypeBuilder<FastingSession> builder)
    {
        builder.ToTable("fasting_sessions");
        builder.HasKey(f => f.Id);
        builder.Property(f => f.FastingType).HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(f => f.Status).HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(f => f.MoodNotes).HasMaxLength(500);

        builder.HasIndex(f => new { f.UserId, f.Status });
    }
}

public class FmdCycleConfiguration : IEntityTypeConfiguration<FmdCycle>
{
    public void Configure(EntityTypeBuilder<FmdCycle> builder)
    {
        builder.ToTable("fmd_cycles");
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Status).HasConversion<string>().HasMaxLength(50).IsRequired();

        builder.HasIndex(f => new { f.UserId, f.Status });
    }
}

public class FmdRuleConfiguration : IEntityTypeConfiguration<FmdRule>
{
    public void Configure(EntityTypeBuilder<FmdRule> builder)
    {
        builder.ToTable("fmd_rules");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Description).HasMaxLength(255);
        builder.HasIndex(r => r.DayNumber).IsUnique();
    }
}

public class MealTemplateConfiguration : IEntityTypeConfiguration<MealTemplate>
{
    public void Configure(EntityTypeBuilder<MealTemplate> builder)
    {
        builder.ToTable("meal_templates");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Name).HasMaxLength(255).IsRequired();
        builder.Property(t => t.Description).HasMaxLength(1000);
        builder.Property(t => t.AssociatedFastingType).HasConversion<string>().HasMaxLength(50);
        builder.Property(t => t.RecipeContentJson).HasColumnType("jsonb");
    }
}
