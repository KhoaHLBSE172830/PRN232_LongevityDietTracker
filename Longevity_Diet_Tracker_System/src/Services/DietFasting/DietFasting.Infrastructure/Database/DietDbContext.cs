using System.Reflection;
using DietFasting.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace DietFasting.Infrastructure.Database;

public class DietDbContext : DbContext
{
    public DietDbContext(DbContextOptions<DietDbContext> options) : base(options) { }

    public DbSet<MealLog> MealLogs => Set<MealLog>();
    public DbSet<MealFoodItem> MealFoodItems => Set<MealFoodItem>();
    public DbSet<FastingSession> FastingSessions => Set<FastingSession>();
    public DbSet<FmdCycle> FmdCycles => Set<FmdCycle>();
    public DbSet<MealTemplate> MealTemplates => Set<MealTemplate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}

