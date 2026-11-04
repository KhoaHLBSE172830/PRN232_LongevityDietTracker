using BuildingBlocks.Common.Exceptions;

namespace Consultation.Domain.Exceptions;

public class ConsultationNotFoundException : NotFoundException
{
    public ConsultationNotFoundException(Guid id) 
        : base($"Consultation session with ID '{id}' was not found.") { }
}

public class NutritionistNotFoundException : NotFoundException
{
    public NutritionistNotFoundException(Guid id) 
        : base($"Nutritionist with ID '{id}' was not found.") { }
}

