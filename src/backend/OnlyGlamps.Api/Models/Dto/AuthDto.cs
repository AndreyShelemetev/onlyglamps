namespace OnlyGlamps.Api.Models.Dto;

public record LoginRequest(string Email, string Password);

public class TelegramLoginData
{
    public long Id { get; set; }
    public string? Username { get; set; }
    public string FirstName { get; set; } = "";
    public string? LastName { get; set; }
    public string? PhotoUrl { get; set; }
    public long AuthDate { get; set; }
    public string Hash { get; set; } = "";
}
