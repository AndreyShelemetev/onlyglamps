namespace OnlyGlamps.Api.Models.Entities;

public class AvailabilityCalendar
{
    public int Id { get; set; }
    public int ObjectId { get; set; }
    public DateOnly Date { get; set; }
    public AvailabilityStatus Status { get; set; } = AvailabilityStatus.Available;

    public GlampingObject Object { get; set; } = null!;
}
