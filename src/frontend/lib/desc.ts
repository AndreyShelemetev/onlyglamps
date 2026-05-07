/**
 * Разбивает HTML строку по <h3>...</h3> заголовкам на секции.
 * Возвращает [{ title, html }] — title может быть пустой для лидера до первого h3.
 */
export type DescSection = { title: string; html: string };

export function splitDescriptionByH3(html: string): DescSection[] {
  if (!html) return [];
  const parts = html.split(/<h3[^>]*>/i);
  const sections: DescSection[] = [];

  // Часть до первого <h3> — это «Описание».
  const lead = parts.shift() ?? "";
  if (lead.trim()) {
    sections.push({ title: "", html: lead.trim() });
  }

  for (const part of parts) {
    const m = part.match(/^([\s\S]*?)<\/h3>([\s\S]*)$/i);
    if (!m) continue;
    const title = stripTags(m[1]).trim();
    const body = (m[2] ?? "").trim();
    if (title || body) sections.push({ title, html: body });
  }
  return sections;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
