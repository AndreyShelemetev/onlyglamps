using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OnlyGlamps.Api.Data;
using OnlyGlamps.Api.Models.Entities;

namespace OnlyGlamps.Api.Services;

public static class CustomFieldsService
{
    /// <summary>
    /// Replaces field values for a GlampingObject using definitions of its ObjectType.
    /// Unknown keys and fields belonging to other types are ignored.
    /// Does not call SaveChanges — the caller does.
    /// </summary>
    public static async Task ApplyAsync(AppDbContext db, int objectId, int objectTypeId, Dictionary<string, object?>? values)
    {
        var existing = await db.ObjectFieldValues.Where(v => v.ObjectId == objectId).ToListAsync();
        db.ObjectFieldValues.RemoveRange(existing);

        if (values == null || values.Count == 0) return;

        var fields = await db.ObjectTypeFields
            .Where(f => f.ObjectTypeId == objectTypeId)
            .ToListAsync();

        foreach (var field in fields)
        {
            if (!values.TryGetValue(field.Key, out var raw) || raw == null) continue;

            var fv = new ObjectFieldValue { ObjectId = objectId, FieldId = field.Id };
            switch (field.FieldType)
            {
                case "number":
                    if (TryParseDecimal(raw, out var num)) fv.ValueNumber = num;
                    else continue;
                    break;
                case "boolean":
                    if (TryParseBool(raw, out var b)) fv.ValueBool = b;
                    else continue;
                    break;
                default: // text, textarea, select
                    var s = ToStringValue(raw);
                    if (string.IsNullOrEmpty(s)) continue;
                    fv.ValueText = s;
                    break;
            }
            db.ObjectFieldValues.Add(fv);
        }
    }

    private static bool TryParseDecimal(object raw, out decimal value)
    {
        value = 0m;
        if (raw is JsonElement je)
        {
            if (je.ValueKind == JsonValueKind.Number) { value = je.GetDecimal(); return true; }
            if (je.ValueKind == JsonValueKind.String) return decimal.TryParse(je.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out value);
            return false;
        }
        if (raw is decimal d) { value = d; return true; }
        if (raw is double dd) { value = (decimal)dd; return true; }
        if (raw is float f) { value = (decimal)f; return true; }
        if (raw is int i) { value = i; return true; }
        if (raw is long l) { value = l; return true; }
        return decimal.TryParse(raw.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out value);
    }

    private static bool TryParseBool(object raw, out bool value)
    {
        value = false;
        if (raw is JsonElement je)
        {
            if (je.ValueKind == JsonValueKind.True) { value = true; return true; }
            if (je.ValueKind == JsonValueKind.False) { value = false; return true; }
            if (je.ValueKind == JsonValueKind.String) return bool.TryParse(je.GetString(), out value);
            if (je.ValueKind == JsonValueKind.Number) { value = je.GetDecimal() != 0m; return true; }
            return false;
        }
        if (raw is bool bb) { value = bb; return true; }
        return bool.TryParse(raw.ToString(), out value);
    }

    private static string ToStringValue(object raw)
    {
        if (raw is JsonElement je)
        {
            return je.ValueKind switch
            {
                JsonValueKind.String => je.GetString() ?? "",
                JsonValueKind.Number => je.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                _ => je.GetRawText()
            };
        }
        return raw.ToString() ?? "";
    }

    /// <summary>
    /// Builds a map { fieldKey: serializableValue } for output.
    /// </summary>
    public static Dictionary<string, object?> Serialize(IEnumerable<ObjectFieldValue> values, IEnumerable<ObjectTypeField> schema)
    {
        var fieldById = schema.ToDictionary(f => f.Id);
        var result = new Dictionary<string, object?>();
        foreach (var v in values)
        {
            if (!fieldById.TryGetValue(v.FieldId, out var f)) continue;
            result[f.Key] = f.FieldType switch
            {
                "number" => v.ValueNumber,
                "boolean" => v.ValueBool,
                _ => v.ValueText
            };
        }
        return result;
    }
}
