using BuildingBlocks.Common.ResponseCode;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BuildingBlocks.Common.Filters;

public class ValidationFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.ModelState.IsValid)
        {
            var errors = context.ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value?.Errors.Select(e => e.ErrorMessage).ToArray()
                );

            var firstError = context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .FirstOrDefault() ?? RespMsg.BAD_REQUEST;

            context.Result = new BadRequestObjectResult(new GenericResp<object>
            {
                Code = RespCode.BAD_REQUEST,
                Message = firstError,
                Data = errors
            });
        }
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}

