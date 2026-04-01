using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace OnlyGlamps.Api.Services;

public static partial class SlugService
{
    private static readonly Dictionary<char, string> Transliteration = new()
    {
        ['а'] = "a", ['б'] = "b", ['в'] = "v", ['г'] = "g", ['д'] = "d",
        ['е'] = "e", ['ё'] = "yo", ['ж'] = "zh", ['з'] = "z", ['и'] = "i",
        ['й'] = "y", ['к'] = "k", ['л'] = "l", ['м'] = "m", ['н'] = "n",
        ['о'] = "o", ['п'] = "p", ['р'] = "r", ['с'] = "s", ['т'] = "t",
        ['у'] = "u", ['ф'] = "f", ['х'] = "kh", ['ц'] = "ts", ['ч'] = "ch",
        ['ш'] = "sh", ['щ'] = "shch", ['ъ'] = "", ['ы'] = "y", ['ь'] = "",
        ['э'] = "e", ['ю'] = "yu", ['я'] = "ya",
    };

    public static string Generate(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        var lower = input.ToLowerInvariant().Trim();

        var sb = new StringBuilder(lower.Length);
        foreach (var ch in lower)
        {
            if (Transliteration.TryGetValue(ch, out var replacement))
                sb.Append(replacement);
            else if (ch is >= 'a' and <= 'z' or >= '0' and <= '9')
                sb.Append(ch);
            else if (ch is ' ' or '-' or '_' or '/')
                sb.Append('-');
            // else: skip
        }

        var slug = sb.ToString();

        // Collapse multiple dashes, trim dashes
        slug = MultipleDashesRegex().Replace(slug, "-").Trim('-');

        return slug;
    }

    [GeneratedRegex("-{2,}")]
    private static partial Regex MultipleDashesRegex();
}
