using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Models.Entities;

namespace OnlyGlamps.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<OwnerProfile> OwnerProfiles => Set<OwnerProfile>();
    public DbSet<Region> Regions => Set<Region>();
    public DbSet<CityOrDistrict> CitiesAndDistricts => Set<CityOrDistrict>();
    public DbSet<ObjectType> ObjectTypes => Set<ObjectType>();
    public DbSet<Amenity> Amenities => Set<Amenity>();
    public DbSet<GlampingObject> GlampingObjects => Set<GlampingObject>();
    public DbSet<ObjectAmenity> ObjectAmenities => Set<ObjectAmenity>();
    public DbSet<Tariff> Tariffs => Set<Tariff>();
    public DbSet<AvailabilityCalendar> AvailabilityCalendars => Set<AvailabilityCalendar>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ObjectPhoto> ObjectPhotos => Set<ObjectPhoto>();
    public DbSet<SeoMeta> SeoMetas => Set<SeoMeta>();
    public DbSet<PopularQuery> PopularQueries => Set<PopularQuery>();
    public DbSet<SourceLink> SourceLinks => Set<SourceLink>();
    public DbSet<Inquiry> Inquiries => Set<Inquiry>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<ObjectTag> ObjectTags => Set<ObjectTag>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasPostgresExtension("pg_trgm");

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.TelegramId).IsUnique().HasFilter("\"TelegramId\" IS NOT NULL");
            e.HasIndex(u => u.Email).IsUnique().HasFilter("\"Email\" IS NOT NULL");
            e.Property(u => u.Role).HasConversion<string>();
        });

        // OwnerProfile
        modelBuilder.Entity<OwnerProfile>(e =>
        {
            e.HasOne(op => op.User)
                .WithOne(u => u.OwnerProfile)
                .HasForeignKey<OwnerProfile>(op => op.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Region
        modelBuilder.Entity<Region>(e =>
        {
            e.HasIndex(r => r.Slug).IsUnique();
        });

        // CityOrDistrict
        modelBuilder.Entity<CityOrDistrict>(e =>
        {
            e.HasIndex(c => new { c.RegionId, c.Slug }).IsUnique();
            e.HasOne(c => c.Region)
                .WithMany(r => r.CitiesAndDistricts)
                .HasForeignKey(c => c.RegionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ObjectType
        modelBuilder.Entity<ObjectType>(e =>
        {
            e.HasIndex(ot => ot.Slug).IsUnique();
        });

        // Amenity
        modelBuilder.Entity<Amenity>(e =>
        {
            e.HasIndex(a => a.Slug).IsUnique();
        });

        // GlampingObject
        modelBuilder.Entity<GlampingObject>(e =>
        {
            e.HasIndex(o => o.Slug);
            e.Property(o => o.Status).HasConversion<string>();
            e.Property(o => o.Area).HasPrecision(10, 2);

            e.HasOne(o => o.Owner)
                .WithMany(u => u.Objects)
                .HasForeignKey(o => o.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(o => o.ModeratedBy)
                .WithMany()
                .HasForeignKey(o => o.ModeratedById)
                .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(o => o.ObjectType)
                .WithMany(ot => ot.Objects)
                .HasForeignKey(o => o.ObjectTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(o => o.Region)
                .WithMany(r => r.Objects)
                .HasForeignKey(o => o.RegionId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(o => o.CityOrDistrict)
                .WithMany(c => c.Objects)
                .HasForeignKey(o => o.CityOrDistrictId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ObjectTag (many-to-many)
        modelBuilder.Entity<ObjectTag>(e =>
        {
            e.HasKey(ot => new { ot.ObjectId, ot.TagId });
            e.HasOne(ot => ot.Object).WithMany(o => o.ObjectTags).HasForeignKey(ot => ot.ObjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ot => ot.Tag).WithMany(t => t.ObjectTags).HasForeignKey(ot => ot.TagId).OnDelete(DeleteBehavior.Cascade);
        });

        // Tag
        modelBuilder.Entity<Tag>(e =>
        {
            e.HasIndex(t => t.Slug).IsUnique();
        });

        // ObjectAmenity (many-to-many)
        modelBuilder.Entity<ObjectAmenity>(e =>
        {
            e.HasKey(oa => new { oa.ObjectId, oa.AmenityId });

            e.HasOne(oa => oa.Object)
                .WithMany(o => o.ObjectAmenities)
                .HasForeignKey(oa => oa.ObjectId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(oa => oa.Amenity)
                .WithMany(a => a.ObjectAmenities)
                .HasForeignKey(oa => oa.AmenityId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Tariff
        modelBuilder.Entity<Tariff>(e =>
        {
            e.Property(t => t.Price).HasPrecision(12, 2);

            e.HasOne(t => t.Object)
                .WithMany(o => o.Tariffs)
                .HasForeignKey(t => t.ObjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // AvailabilityCalendar
        modelBuilder.Entity<AvailabilityCalendar>(e =>
        {
            e.HasIndex(ac => new { ac.ObjectId, ac.Date }).IsUnique();
            e.Property(ac => ac.Status).HasConversion<string>();

            e.HasOne(ac => ac.Object)
                .WithMany(o => o.AvailabilityDates)
                .HasForeignKey(ac => ac.ObjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Review
        modelBuilder.Entity<Review>(e =>
        {
            e.Property(r => r.Status).HasConversion<string>();

            e.HasOne(r => r.Object)
                .WithMany(o => o.Reviews)
                .HasForeignKey(r => r.ObjectId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(r => r.User)
                .WithMany(u => u.Reviews)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ObjectPhoto
        modelBuilder.Entity<ObjectPhoto>(e =>
        {
            e.HasOne(p => p.Object)
                .WithMany(o => o.Photos)
                .HasForeignKey(p => p.ObjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // SeoMeta
        modelBuilder.Entity<SeoMeta>(e =>
        {
            e.HasIndex(s => new { s.PageType, s.RegionId, s.CityOrDistrictId, s.ObjectTypeId }).IsUnique();
        });

        // SourceLink
        modelBuilder.Entity<SourceLink>(e =>
        {
            e.HasIndex(sl => sl.ObjectId).IsUnique();

            e.HasOne(sl => sl.Object)
                .WithOne(o => o.SourceLink)
                .HasForeignKey<SourceLink>(sl => sl.ObjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Inquiry
        modelBuilder.Entity<Inquiry>(e =>
        {
            e.HasOne(i => i.Object)
                .WithMany(o => o.Inquiries)
                .HasForeignKey(i => i.ObjectId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(i => i.User)
                .WithMany(u => u.Inquiries)
                .HasForeignKey(i => i.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
