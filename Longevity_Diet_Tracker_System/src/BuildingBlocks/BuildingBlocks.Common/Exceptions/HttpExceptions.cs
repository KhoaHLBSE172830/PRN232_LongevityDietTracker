namespace BuildingBlocks.Common.Exceptions;

public class BaseHttpException : Exception
{
    public int StatusCode { get; }

    public BaseHttpException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }
}

public class BadRequestException : BaseHttpException
{
    public BadRequestException(string message) : base(400, message) { }
}

public class UnauthorizedException : BaseHttpException
{
    public UnauthorizedException(string message = "Unauthorized") : base(401, message) { }
}

public class ForbiddenException : BaseHttpException
{
    public ForbiddenException(string message = "Forbidden") : base(403, message) { }
}

public class NotFoundException : BaseHttpException
{
    public NotFoundException(string message = "Resource not found") : base(404, message) { }
}

public class ConflictException : BaseHttpException
{
    public ConflictException(string message) : base(409, message) { }
}

public class InternalServerException : BaseHttpException
{
    public InternalServerException(string message = "Internal Server Error") : base(500, message) { }
}

