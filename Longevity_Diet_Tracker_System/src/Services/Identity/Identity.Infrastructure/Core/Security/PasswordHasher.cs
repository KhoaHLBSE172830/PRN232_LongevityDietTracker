using System.Security.Cryptography;
using System.Text;
using Identity.Application.Security;

namespace Identity.Infrastructure.Core.Security;

public class PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16;      // 128-bit salt
    private const int KeySize = 32;       // 256-bit subkey
    private const int Iterations = 100_000; // OWASP recommendation for PBKDF2-HMAC-SHA256
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;
    private const char SegmentDelimiter = ':';

    public string HashPassword(string password)
    {
        if (string.IsNullOrEmpty(password))
            throw new ArgumentException("Password cannot be empty.", nameof(password));

        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            Iterations,
            Algorithm,
            KeySize);

        // Format: pbkdf2-sha256:{iterations}:{salt_base64}:{hash_base64}
        return string.Join(
            SegmentDelimiter,
            "pbkdf2-sha256",
            Iterations.ToString(),
            Convert.ToBase64String(salt),
            Convert.ToBase64String(hash));
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(passwordHash))
            return false;

        // Check format: pbkdf2-sha256:{iterations}:{salt}:{hash}
        var segments = passwordHash.Split(SegmentDelimiter);
        if (segments.Length == 4 && segments[0] == "pbkdf2-sha256")
        {
            if (!int.TryParse(segments[1], out var iterations))
                return false;

            byte[] salt;
            byte[] expectedHash;
            try
            {
                salt = Convert.FromBase64String(segments[2]);
                expectedHash = Convert.FromBase64String(segments[3]);
            }
            catch (FormatException)
            {
                return false;
            }

            byte[] actualHash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                iterations,
                Algorithm,
                expectedHash.Length);

            return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
        }

        // Backward compatibility fallback for legacy unsalted SHA-256 (32 bytes = 44 base64 chars)
        try
        {
            using var sha256 = SHA256.Create();
            var legacyHashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            var legacyBase64 = Convert.ToBase64String(legacyHashBytes);
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(legacyBase64),
                Encoding.UTF8.GetBytes(passwordHash));
        }
        catch
        {
            return false;
        }
    }
}

