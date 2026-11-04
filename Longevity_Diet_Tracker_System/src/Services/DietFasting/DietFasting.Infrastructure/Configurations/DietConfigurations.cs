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
    }
}

public class FastingSessionConfiguration : IEntityTypeConfiguration<FastingSession>
{
    public void Configure(EntityTypeBuilder<FastingSession> builder)
    {
        builder.ToTable("fasting_sessions");
        builder.HasKey(s => s.Id);
        builder.HasIndex(s => new { s.UserId, s.Status });
    }
}

public class FmdCycleConfiguration : IEntityTypeConfiguration<FmdCycle>
{
    public void Configure(EntityTypeBuilder<FmdCycle> builder)
    {
        builder.ToTable("fmd_cycles");
        builder.HasKey(c => c.Id);
        builder.HasIndex(c => new { c.UserId, c.Status });
    }
}

public class MealTemplateConfiguration : IEntityTypeConfiguration<MealTemplate>
{
    public void Configure(EntityTypeBuilder<MealTemplate> builder)
    {
        builder.ToTable("meal_templates");
        builder.HasKey(t => t.Id);
    }
}

