using Consultation.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Consultation.Infrastructure.Configurations;

public class NutritionistProfileConfiguration : IEntityTypeConfiguration<NutritionistProfile>
{
    public void Configure(EntityTypeBuilder<NutritionistProfile> builder)
    {
        builder.ToTable("nutritionist_profiles");
        builder.HasKey(n => n.Id);
        builder.HasIndex(n => n.UserId).IsUnique();
    }
}

public class ConsultationSessionConfiguration : IEntityTypeConfiguration<ConsultationSession>
{
    public void Configure(EntityTypeBuilder<ConsultationSession> builder)
    {
        builder.ToTable("consultation_sessions");
        builder.HasKey(s => s.Id);
        builder.HasIndex(s => new { s.NutritionistId, s.ScheduledAtUtc });

        builder.HasOne(s => s.Nutritionist)
               .WithMany(n => n.Sessions)
               .HasForeignKey(s => s.NutritionistId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}

public class AdviceNoteConfiguration : IEntityTypeConfiguration<AdviceNote>
{
    public void Configure(EntityTypeBuilder<AdviceNote> builder)
    {
        builder.ToTable("advice_notes");
        builder.HasKey(a => a.Id);

        builder.HasOne(a => a.ConsultationSession)
               .WithOne(s => s.AdviceNote)
               .HasForeignKey<AdviceNote>(a => a.ConsultationSessionId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

