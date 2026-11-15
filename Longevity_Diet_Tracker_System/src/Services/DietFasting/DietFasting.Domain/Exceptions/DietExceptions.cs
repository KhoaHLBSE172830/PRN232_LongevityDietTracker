using BuildingBlocks.Common.Exceptions;

namespace DietFasting.Domain.Exceptions;

public class FastingSessionNotFoundException : NotFoundException
{
    public FastingSessionNotFoundException(Guid id) 
        : base($"Fasting session with ID '{id}' was not found.") { }
}

public class ActiveFastingSessionAlreadyExistsException : ConflictException
{
    public ActiveFastingSessionAlreadyExistsException(Guid userId) 
        : base($"User '{userId}' already has an active ongoing fasting session.") { }
}

public class FastingSessionAccessDeniedException : ForbiddenException
{
    public FastingSessionAccessDeniedException()
        : base("You do not have permission to access this fasting session.") { }
}

public class InvalidFastingSessionException : BadRequestException
{
    public InvalidFastingSessionException(string message) : base(message) { }
}

public class ActiveFmdCycleAlreadyExistsException : ConflictException
{
    public ActiveFmdCycleAlreadyExistsException(Guid userId) 
        : base($"User '{userId}' already has an active FMD cycle in progress.") { }
}

public class MealLogNotFoundException : NotFoundException
{
    public MealLogNotFoundException(Guid id) 
        : base($"Meal log with ID '{id}' was not found.") { }
}


public class InvalidFmdCycleException : BadRequestException
{
    public InvalidFmdCycleException(string message) : base(message) { }
}

public class FmdCycleNotFoundException : NotFoundException
{
    public FmdCycleNotFoundException(Guid id)
        : base($"FMD cycle with ID '{id}' was not found.") { }
}

public class InvalidHabitLogException : BadRequestException
{
    public InvalidHabitLogException(string message) : base(message) { }
}
