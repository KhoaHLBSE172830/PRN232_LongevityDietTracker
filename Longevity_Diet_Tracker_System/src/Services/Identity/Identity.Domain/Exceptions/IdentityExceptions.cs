using BuildingBlocks.Common.Exceptions;

namespace Identity.Domain.Exceptions;

public class UserNotFoundException : NotFoundException
{
    public UserNotFoundException(string identifier) 
        : base($"User with identifier '{identifier}' was not found.") { }
}

public class EmailAlreadyExistsException : ConflictException
{
    public EmailAlreadyExistsException(string email) 
        : base($"Email '{email}' is already registered.") { }
}

public class InvalidCredentialsException : BadRequestException
{
    public InvalidCredentialsException(string message = "Invalid email or password.") 
        : base(message) { }
}

