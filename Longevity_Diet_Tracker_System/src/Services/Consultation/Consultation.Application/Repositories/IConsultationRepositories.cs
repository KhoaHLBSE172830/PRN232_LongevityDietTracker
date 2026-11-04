using BuildingBlocks.Common.Repositories;
using Consultation.Domain.Entities;

namespace Consultation.Application.Repositories;

public interface IConsultationSessionRepository : IGenericRepository<ConsultationSession>
{
    Task<List<ConsultationSession>> GetByNutritionistIdAsync(Guid nutritionistId);
    Task<ConsultationSession?> GetWithAdviceAsync(Guid sessionId);
}

public interface INutritionistProfileRepository : IGenericRepository<NutritionistProfile>
{
    Task<NutritionistProfile?> GetByUserIdAsync(Guid userId);
}

public interface IAdviceNoteRepository : IGenericRepository<AdviceNote>
{
}

