namespace OnlyGlamps.Api.Models.Entities;

public enum UserRole
{
    User = 0,
    Owner = 1,
    Admin = 2,
    Author = 3
}

public enum ObjectStatus
{
    Draft = 0,
    OnModeration = 1,
    Published = 2,
    Rejected = 3,
    Archived = 4
}

public enum AvailabilityStatus
{
    Available = 0,
    Booked = 1,
    OnRequest = 2
}

public enum ReviewStatus
{
    Pending = 0,
    Published = 1,
    Hidden = 2
}

public enum ArticleStatus
{
    Draft = 0,
    Published = 1,
    Archived = 2
}
