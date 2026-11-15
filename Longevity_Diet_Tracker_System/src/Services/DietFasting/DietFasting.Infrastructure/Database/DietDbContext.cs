using System.Reflection;
using DietFasting.Domain.Entities;
using DietFasting.Domain.Exceptions;
using DietFasting.Infrastructure.Configurations;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace DietFasting.Infrastructure.Database;

public class DietDbContext : DbContext
{
    public DietDbContext(DbContextOptions<DietDbContext> options) : base(options) { }

    public DbSet<MealLog> MealLogs => Set<MealLog>();
    public DbSet<MealFoodItem> MealFoodItems => Set<MealFoodItem>();
    public DbSet<FastingSession> FastingSessions => Set<FastingSession>();
    public DbSet<FmdCycle> FmdCycles => Set<FmdCycle>();
    public DbSet<FmdRule> FmdRules => Set<FmdRule>();
    public DbSet<MealTemplate> MealTemplates => Set<MealTemplate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await base.SaveChangesAsync(cancellationToken);
        }
        // Two concurrent "start" requests can both pass the application-level check; the partial unique index is the
        // authoritative guard. Translate its violation into the domain exception (HTTP 409) instead of a 500.
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: FastingSessionConfiguration.ActiveSessionIndexName
        })
        {
            var userId = ex.Entries.Select(e => e.Entity).OfType<FastingSession>().Select(s => s.UserId).FirstOrDefault();
            throw new ActiveFastingSessionAlreadyExistsException(userId);
        }
    }
}
