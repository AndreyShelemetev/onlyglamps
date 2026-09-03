import type { ObjectDetail } from "./api";
import { cityPrepositional, regionPrepositional } from "./morph";

/**
 * Тексты карточки, собранные из наших собственных фактов.
 *
 * Мета-описание раньше было одним шаблоном на весь каталог: менялось
 * только название объекта, остальные 14 тысяч страниц получали
 * идентичный текст. Здесь оно собирается из того, что мы про объект
 * реально знаем — тип, место, вместимость, удобства, цена.
 *
 * Ничего не выдумываем: отсутствующий факт просто не попадает в текст.
 */

/** Короткие формы удобств для перечисления в предложении. */
const AMENITY_SHORT: Record<string, string> = {
  banya: "баня",
  chan: "чан",
  mangal: "мангал",
  besedka: "беседка",
  wifi: "Wi-Fi",
  parkovka: "парковка",
  "u-vody": "у воды",
  "u-lesa": "у леса",
  kuhnya: "кухня",
  bassein: "бассейн",
  "s-pitomtsami": "можно с питомцами",
  "s-detmi": "можно с детьми",
};

/**
 * Оборот «до N …» требует родительного падежа множественного числа,
 * а он для «гостя» всегда «гостей» — независимо от числа.
 */
const GUESTS_AFTER_DO = "гостей";

/** Удобства, которые описывают расположение, а не оснащение. */
const LOCATION_SLUGS: Record<string, string> = {
  "u-vody": "у воды",
  "u-lesa": "у леса",
};

/** Удобства-правила: они попадают в отдельное предложение про правила. */
const RULE_SLUGS = new Set(["s-detmi", "s-pitomtsami"]);

function amenityPhrases(obj: ObjectDetail, limit: number): string[] {
  return (obj.amenities ?? [])
    .filter((a) => !RULE_SLUGS.has(a.slug) && !LOCATION_SLUGS[a.slug])
    .map((a) => AMENITY_SHORT[a.slug] ?? a.name.toLowerCase())
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .slice(0, limit);
}

/** «у воды», «у леса» — из них собирается фраза о расположении. */
function locationPhrases(obj: ObjectDetail): string[] {
  return (obj.amenities ?? [])
    .map((a) => LOCATION_SLUGS[a.slug])
    .filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i);
}

function minPrice(obj: ObjectDetail): number | null {
  const prices = (obj.tariffs ?? []).map((t) => t.price).filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : null;
}

/** Место в предложном падеже: «в Белокурихе, Алтайском крае». */
function placePhrase(obj: ObjectDetail): string {
  const region = regionPrepositional(obj.region?.name);
  const city = cityPrepositional(obj.cityOrDistrict?.name);
  if (city && region) return `${city}, ${region}`;
  return region || city || "";
}

/**
 * Тип не повторяем, если он уже есть в названии: иначе выходит
 * «Парк-отель «Парк-отель «Вудлэнд Кэмп»»».
 */
const ACCOMMODATION_NOUNS = [
  "отель", "дом", "глэмпинг", "коттедж", "база", "усадьба", "вилла",
  "шале", "апартамент", "кемпинг", "баня", "сауна", "комплекс", "клуб",
  "хостел", "турбаза", "гостиница", "пансионат", "санаторий", "резиденц",
  "hotel", "resort", "camp", "house", "village", "park",
];

function typePrefix(obj: ObjectDetail): string | null {
  const type = obj.objectType?.name;
  if (!type) return null;
  const name = (obj.name ?? "").toLowerCase();
  if (name.includes(type.toLowerCase())) return null;
  // Название уже начинается с обозначения жилья — «Эко-отель Altay Sense».
  // Подставлять перед ним «Парк-отель» значит написать противоречие.
  if (ACCOMMODATION_NOUNS.some((n) => name.includes(n))) return null;
  return type;
}

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

/**
 * Мета-описание, ~150–170 символов. Порядок фактов от важного к
 * второстепенному, хвост обрезается по границе предложения.
 */
export function buildMetaDescription(obj: ObjectDetail): string {
  const parts: string[] = [];

  const place = placePhrase(obj);
  const type = typePrefix(obj);
  const subject = type ? `${type} «${obj.name}»` : obj.name;
  parts.push(place ? `${subject} в ${place}.` : `${subject}.`);

  const facts: string[] = [];
  if (obj.capacity > 0) facts.push(`до ${obj.capacity} ${GUESTS_AFTER_DO}`);
  const amenities = amenityPhrases(obj, 3);
  if (amenities.length) facts.push(amenities.join(", "));
  if (facts.length) parts.push(`${capitalize(facts.join(", "))}.`);

  const price = minPrice(obj);
  if (price) parts.push(`От ${price.toLocaleString("ru-RU")} ₽ за сутки.`);

  parts.push("Фото, удобства, карта и свободные даты.");

  let text = parts.join(" ");
  if (text.length > 170) {
    // Режем по границе предложения, чтобы не обрывать на полуслове.
    const cut = text.lastIndexOf(".", 170);
    text = cut > 60 ? text.slice(0, cut + 1) : `${text.slice(0, 167)}…`;
  }
  return text;
}

/**
 * Развёрнутый текст для вкладки «Обзор» — там, где нет авторского
 * описания. Собирается из фактов: тип, место, вместимость, спальные
 * места, площадь, удобства, правила, цена.
 *
 * Ни одного придуманного факта: чего нет в данных, того нет и в тексте.
 * Формулировка одна на весь каталог — вариации по id пробовались, но
 * любой оборот без предлога ломается о предложный падеж места
 * («— Калининграде»), а уникальность даёт набор фактов, не перестановка слов.
 */
export function buildOverviewText(obj: ObjectDetail): string {
  const sentences: string[] = [];
  const place = placePhrase(obj);
  const type = typePrefix(obj);
  const subject = type ? `${type} «${obj.name}»` : `«${obj.name}»`;

  const location = locationPhrases(obj);
  const near = location.length ? `, ${location.join(", ")}` : "";

  if (place) {
    // Одна форма вместо вариаций: «место» стоит в предложном падеже,
    // и любой оборот без предлога («— Калининграде») ломается.
    // Глагол намеренно без рода: «База отдыха … расположен» — ошибка,
    // а род типа мы не знаем и хранить его негде.
    sentences.push(`${subject} находится в ${place}${near}.`);
  } else {
    sentences.push(`${subject}${near}.`);
  }

  const capacity: string[] = [];
  if (obj.capacity > 0) capacity.push(`размещение до ${obj.capacity} ${GUESTS_AFTER_DO}`);
  if (obj.beds) capacity.push(`${obj.beds} спальных мест`);
  if (obj.area) capacity.push(`площадь ${obj.area} м²`);
  if (capacity.length) sentences.push(`${capitalize(capacity.join(", "))}.`);

  const amenities = amenityPhrases(obj, 8);
  if (amenities.length) {
    sentences.push(`Доступны: ${amenities.join(", ")}.`);
  }

  const rules: string[] = [];
  if (obj.childrenAllowed) rules.push("детьми");
  if (obj.petsAllowed) rules.push("питомцами");
  // Предлог один на всё перечисление: «с детьми и с питомцами» — лишнее «с».
  if (rules.length) sentences.push(`Можно приезжать с ${rules.join(" и ")}.`);

  const times: string[] = [];
  if (obj.checkInTime) times.push(`заезд с ${obj.checkInTime}`);
  if (obj.checkOutTime) times.push(`выезд до ${obj.checkOutTime}`);
  if (times.length) sentences.push(`${capitalize(times.join(", "))}.`);

  const price = minPrice(obj);
  if (price) sentences.push(`Стоимость от ${price.toLocaleString("ru-RU")} ₽ за сутки.`);

  return sentences.join(" ");
}

/** Title карточки. H1 — только название, поэтому они гарантированно разные. */
export function buildObjectTitle(obj: ObjectDetail): string {
  const place = placePhrase(obj);
  const type = typePrefix(obj);
  if (!place) return type ? `${obj.name} — ${type}` : obj.name;
  // Без типа «— в Йошкар-Оле» читается как обрывок, поэтому подставляем
  // «отдых»: тире должно отделять пояснение, а не предлог.
  return type
    ? `${obj.name} — ${type} в ${place}`
    : `${obj.name} — отдых в ${place}`;
}
