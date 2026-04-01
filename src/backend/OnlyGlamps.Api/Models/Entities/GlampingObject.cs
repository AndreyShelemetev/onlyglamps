namespace OnlyGlamps.Api.Models.Entities;

public class GlampingObject
{
    public int Id { get; set; }
    public int OwnerId { get; set; }
    public int ObjectTypeId { get; set; }
    public int RegionId { get; set; }
    public int CityOrDistrictId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? ShortDescription { get; set; }
    public string? FullDescription { get; set; }

    public decimal? Area { get; set; }
    public int Capacity { get; set; }
    public int? Beds { get; set; }
    public int? Rooms { get; set; }
    public bool IsWhole { get; set; }
    public int? MinRentalDays { get; set; }
    public int? MaxRentalDays { get; set; }

    public string? Address { get; set; }
    public string? Settlement { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }

    public bool ChildrenAllowed { get; set; }
    public bool PetsAllowed { get; set; }
    public bool SmokingAllowed { get; set; }
    public bool EventsAllowed { get; set; }
    public string? Deposit { get; set; }
    public string? Rules { get; set; }

    public ObjectStatus Status { get; set; } = ObjectStatus.Draft;

    // Moderation
    public string? ModerationComment { get; set; }
    public DateTime? ModeratedAt { get; set; }
    public int? ModeratedById { get; set; }

    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User Owner { get; set; } = null!;
    public User? ModeratedBy { get; set; }
    public ObjectType ObjectType { get; set; } = null!;
    public Region Region { get; set; } = null!;
    public CityOrDistrict CityOrDistrict { get; set; } = null!;
    public SourceLink? SourceLink { get; set; }

    public ICollection<ObjectAmenity> ObjectAmenities { get; set; } = [];
    public ICollection<ObjectTag> ObjectTags { get; set; } = [];
    public ICollection<Tariff> Tariffs { get; set; } = [];
    public ICollection<AvailabilityCalendar> AvailabilityDates { get; set; } = [];
    public ICollection<Review> Reviews { get; set; } = [];
    public ICollection<ObjectPhoto> Photos { get; set; } = [];
    public ICollection<Inquiry> Inquiries { get; set; } = [];
}
