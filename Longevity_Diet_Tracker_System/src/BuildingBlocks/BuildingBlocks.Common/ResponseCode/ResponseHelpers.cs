using Microsoft.AspNetCore.Mvc;

namespace BuildingBlocks.Common.ResponseCode;

public static class SuccessResp
{
    public static IActionResult Ok(string? message = null)
    {
        return new JsonResult(new BaseResp
        {
            Code = RespCode.OK,
            Message = message ?? RespMsg.OK
        })
        { StatusCode = RespCode.OK };
    }

    public static IActionResult Ok<T>(T? data, string? message = null)
    {
        var resp = new GenericResp<T>
        {
            Data = data,
            Code = RespCode.OK,
            Message = message ?? RespMsg.OK
        };

        return new JsonResult(resp) { StatusCode = RespCode.OK };
    }

    public static IActionResult Created(string? message = null)
    {
        return new JsonResult(new BaseResp
        {
            Code = RespCode.CREATED,
            Message = message ?? RespMsg.CREATED
        })
        { StatusCode = RespCode.CREATED };
    }

    public static IActionResult Created<T>(T? data, string? message = null)
    {
        var resp = new GenericResp<T>
        {
            Data = data,
            Code = RespCode.CREATED,
            Message = message ?? RespMsg.CREATED
        };

        return new JsonResult(resp) { StatusCode = RespCode.CREATED };
    }

    public static IActionResult NoContent()
    {
        return new NoContentResult();
    }
}

public static class ErrorResp
{
    public static IActionResult BadRequest(string? message = null)
    {
        return new JsonResult(new BaseResp
        {
            Code = RespCode.BAD_REQUEST,
            Message = message ?? RespMsg.BAD_REQUEST
        })
        { StatusCode = RespCode.BAD_REQUEST };
    }

    public static IActionResult NotFound(string? message = null)
    {
        return new JsonResult(new BaseResp
        {
            Code = RespCode.NOT_FOUND,
            Message = message ?? RespMsg.NOT_FOUND
        })
        { StatusCode = RespCode.NOT_FOUND };
    }

    public static IActionResult Unauthorized(string? message = null)
    {
        return new JsonResult(new BaseResp
        {
            Code = RespCode.UNAUTHORIZED,
            Message = message ?? RespMsg.UNAUTHORIZED
        })
        { StatusCode = RespCode.UNAUTHORIZED };
    }

    public static IActionResult Forbidden(string? message = null)
    {
        return new JsonResult(new BaseResp
        {
            Code = RespCode.FORBIDDEN,
            Message = message ?? RespMsg.FORBIDDEN
        })
        { StatusCode = RespCode.FORBIDDEN };
    }

    public static IActionResult Conflict(string? message = null)
    {
        return new JsonResult(new BaseResp
        {
            Code = RespCode.CONFLICT,
            Message = message ?? RespMsg.CONFLICT
        })
        { StatusCode = RespCode.CONFLICT };
    }

    public static IActionResult InternalServerError(string? message = null)
    {
        return new JsonResult(new BaseResp
        {
            Code = RespCode.INTERNAL_SERVER_ERROR,
            Message = message ?? RespMsg.INTERNAL_SERVER_ERROR
        })
        { StatusCode = RespCode.INTERNAL_SERVER_ERROR };
    }
}

