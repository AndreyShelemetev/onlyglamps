namespace OnlyGlamps.Api.Models.Entities;

public class ObjectTypeField
{
    public int Id { get; set; }
    public int ObjectTypeId { get; set; }

    // Machine-readable key (unique per type), e.g. "min_hours"
    public string Key { get; set; } = string.Empty;

    // Display label, e.g. "Минимальное количество часов"
    public string Label { get; set; } = string.Empty;

    // number | text | textarea | boolean | select
    public string FieldType { get; set; } = "number";

    // Optional unit (hrs, м², шт.)
    public string? Unit { get; set; }
    public string? Placeholder { get; set; }
    public string? HelpText { get; set; }

    // JSON array of {value,label} for select type
    public string? Options { get; set; }

    public decimal? MinValue { get; set; }
    public decimal? MaxValue { get; set; }

    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ObjectType ObjectType { get; set; } = null!;
    public ICollection<ObjectFieldValue> Values { get; set; } = [];
}

public class ObjectFieldValue
{
    public int Id { get; set; }
    public int ObjectId { get; set; }
    public int FieldId { get; set; }

    public string? ValueText { get; set; }
    public decimal? ValueNumber { get; set; }
    public bool? ValueBool { get; set; }

    public GlampingObject Object { get; set; } = null!;
    public ObjectTypeField Field { get; set; } = null!;
}
