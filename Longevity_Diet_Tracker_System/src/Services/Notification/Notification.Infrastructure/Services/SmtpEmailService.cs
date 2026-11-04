using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Notification.Application.Services;
using Notification.Domain.Exceptions;

namespace Notification.Infrastructure.Services;

public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration configuration, ILogger<SmtpEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string to, string subject, string bodyHtml, CancellationToken cancellationToken = default)
    {
        try
        {
            var host = _configuration["Smtp:Host"] ?? "localhost";
            var port = int.Parse(_configuration["Smtp:Port"] ?? "1025");
            var senderEmail = _configuration["Smtp:SenderEmail"] ?? "no-reply@longevitytracker.com";

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = false // Mailpit / dev environment
            };

            var mail = new MailMessage(senderEmail, to, subject, bodyHtml)
            {
                IsBodyHtml = true
            };

            await client.SendMailAsync(mail, cancellationToken);
            _logger.LogInformation("Email sent successfully to {To} with subject '{Subject}'", to, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", to);
            throw new NotificationDispatchException(ex.Message);
        }
    }
}

