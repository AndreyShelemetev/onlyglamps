using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;
using OnlyGlamps.Api.Models.Dto;
using OnlyGlamps.Api.Models.Entities;
using OnlyGlamps.Api.Services;

namespace OnlyGlamps.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AuthService _auth;

    public AuthController(AppDbContext db, AuthService auth)
    {
        _db = db;
        _auth = auth;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { error = "Email и пароль обязательны" });

        var user = await _db.Users
            .Include(u => u.OwnerProfile)
            .FirstOrDefaultAsync(u => u.Email == request.Email.Trim().ToLower());
        if (user == null || string.IsNullOrEmpty(user.PasswordHash))
            return Unauthorized(new { error = "Неверный email или пароль" });

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { error = "Неверный email или пароль" });

        user.AuthDate = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var token = _auth.GenerateJwt(user);
        return Ok(new { token, user = UserDto.FromEntity(user) });
    }

    [HttpPost("telegram")]
    public async Task<IActionResult> TelegramLogin([FromBody] TelegramLoginData request)
    {
        if (!_auth.VerifyTelegramHash(request))
            return Unauthorized(new { error = "Недействительные данные Telegram" });

        var user = await _db.Users
            .Include(u => u.OwnerProfile)
            .FirstOrDefaultAsync(u => u.TelegramId == request.Id);
        if (user == null)
        {
            user = new User
            {
                TelegramId = request.Id,
                Username = request.Username,
                FirstName = request.FirstName,
                LastName = request.LastName,
                AvatarUrl = request.PhotoUrl,
                Role = UserRole.User,
                AuthDate = DateTimeOffset.FromUnixTimeSeconds(request.AuthDate).UtcDateTime,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }
        else
        {
            user.AuthDate = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            if (request.PhotoUrl != null) user.AvatarUrl = request.PhotoUrl;
            await _db.SaveChangesAsync();
        }

        var token = _auth.GenerateJwt(user);
        return Ok(new { token, user = UserDto.FromEntity(user) });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = _auth.GetUserIdFromContext(HttpContext);
        if (userId == null) return Unauthorized();

        var user = await _db.Users
            .Include(u => u.OwnerProfile)
            .FirstOrDefaultAsync(u => u.Id == userId.Value);
        if (user == null) return Unauthorized();

        return Ok(UserDto.FromEntity(user));
    }
}
