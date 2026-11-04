using Identity.Application.Services;

namespace Identity.Infrastructure.Core.Auth;

public class GoogleAuthService : IGoogleAuthService
{
    public async Task<(string Email, string FullName, string GoogleId)> VerifyGoogleTokenAsync(string idToken)
    {
        await Task.Yield();
        if (string.IsNullOrWhiteSpace(idToken))
            throw new BuildingBlocks.Common.Exceptions.BadRequestException("Google token is empty.");

        return ("user@gmail.com", "Google Verified User", "google-sub-id-12345");
    }
}

