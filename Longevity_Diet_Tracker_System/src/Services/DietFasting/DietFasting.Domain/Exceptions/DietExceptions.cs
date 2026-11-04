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

