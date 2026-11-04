using System.Reflection;
using Consultation.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Consultation.Infrastructure.Database;

public class ConsultationDbContext : DbContext
{
    public ConsultationDbContext(DbContextOptions<ConsultationDbContext> options) : base(options) { }

    public DbSet<NutritionistProfile> Nutritionists => Set<NutritionistProfile>();
    public DbSet<ConsultationSession> Sessions => Set<ConsultationSession>();
    public DbSet<AdviceNote> AdviceNotes => Set<AdviceNote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}

