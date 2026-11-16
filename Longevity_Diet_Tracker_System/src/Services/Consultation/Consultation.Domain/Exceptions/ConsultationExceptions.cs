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

public class ConsultationConflictException : ConflictException
{
    public ConsultationConflictException(string message) : base(message) { }
}

public class ConsultationBadRequestException : BadRequestException
{
    public ConsultationBadRequestException(string message) : base(message) { }
}

public class ConsultationForbiddenException : ForbiddenException
{
    public ConsultationForbiddenException(string message) : base(message) { }
}

public class ServiceUnavailableException : BaseHttpException
{
    public ServiceUnavailableException(string message = "Service Unavailable") : base(503, message) { }
}
