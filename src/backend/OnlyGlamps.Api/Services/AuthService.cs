using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using OnlyGlamps.Api.Models.Dto;
using OnlyGlamps.Api.Models.Entities;

namespace OnlyGlamps.Api.Services;

public class AuthService
{
    private readonly string _jwtSecret;
    private readonly string _telegramBotToken;

    public AuthService(IConfiguration config)
    {
        _jwtSecret = config["Jwt:Secret"] ?? "onlyglamps-dev-jwt-secret-key-min-32-chars!!";
        _telegramBotToken = config["Telegram:BotToken"] ?? "";
    }

    public string GenerateJwt(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(ClaimTypes.Name, user.FirstName)
        };

        var token = new JwtSecurityToken(
            issuer: "onlyglamps",
            audience: "onlyglamps",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public bool VerifyTelegramHash(TelegramLoginData data)
    {
        if (string.IsNullOrEmpty(_telegramBotToken)) return false;

        using var sha256 = SHA256.Create();
        var secretKey = sha256.ComputeHash(Encoding.UTF8.GetBytes(_telegramBotToken));

        var checkPairs = new SortedDictionary<string, string>
        {
            ["auth_date"] = data.AuthDate.ToString(),
            ["first_name"] = data.FirstName,
            ["id"] = data.Id.ToString()
        };
        if (!string.IsNullOrEmpty(data.Username)) checkPairs["username"] = data.Username;
        if (!string.IsNullOrEmpty(data.LastName)) checkPairs["last_name"] = data.LastName;
        if (!string.IsNullOrEmpty(data.PhotoUrl)) checkPairs["photo_url"] = data.PhotoUrl;

        var str = string.Join("\n", checkPairs.Select(kv => $"{kv.Key}={kv.Value}"));
        using var hmac = new HMACSHA256(secretKey);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(str));
        var hashHex = Convert.ToHexString(hash).ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(hashHex),
            Encoding.UTF8.GetBytes(data.Hash));
    }

    public int? GetUserIdFromContext(HttpContext context)
    {
        var claim = context.User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim != null && int.TryParse(claim.Value, out var id))
            return id;
        return null;
    }
}
