namespace Notification.Application.Services;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string bodyHtml, CancellationToken cancellationToken = default);
}

