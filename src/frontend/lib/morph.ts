/**
 * Склонение названий регионов в предложный падеж — для оборотов «в …».
 *
 * Заголовки карточек и листингов собирались подстановкой названия в
 * именительном падеже: «Отель Малина — Парк-отель в Алтайский край»,
 * «Усадьба Seehof — Гостевой дом в Московская область». Это видно
 * в выдаче на каждой из 14 тысяч страниц.
 *
 * Правила покрывают все формы, которые реально есть в справочнике.
 * Незнакомое название возвращается как есть: лучше именительный падеж,
 * чем выдуманная форма.
 */

/** Названия, которые не склоняются или склоняются не по общему правилу. */
const EXCEPTIONS: Record<string, string> = {
  "Марий Эл": "Марий Эл",
  "Ханты-Мансийский АО — Югра": "Ханты-Мансийском АО — Югра",
  "Республика Саха (Якутия)": "Республике Саха (Якутия)",
  "Республика Северная Осетия — Алания": "Республике Северная Осетия — Алания",
};

export function regionPrepositional(name: string | null | undefined): string {
  if (!name) return "";
  const value = name.trim();
  if (!value) return "";

  const exception = EXCEPTIONS[value];
  if (exception) return exception;

  // «Республика Крым» → «Республике Крым»: склоняется только первое слово.
  if (value.startsWith("Республика ")) {
    return `Республике ${value.slice("Республика ".length)}`;
  }

  // «Удмуртская Республика» → «Удмуртской Республике».
  const republicMatch = value.match(/^(.*)а[яу]?\s+(Р|р)еспублика$/);
  if (republicMatch) {
    return `${republicMatch[1]}ой ${republicMatch[2]}еспублике`;
  }

  // «Московская область» → «Московской области».
  if (/ая\s+область$/.test(value)) {
    return value.replace(/ая\s+область$/, "ой области");
  }

  // «Алтайский край» → «Алтайском крае».
  if (/ий\s+край$/.test(value)) {
    return value.replace(/ий\s+край$/, "ом крае");
  }

  // «Карелия» → «Карелии», «Мордовия» → «Мордовии».
  if (/ия$/.test(value)) {
    return value.replace(/ия$/, "ии");
  }

  // «Москва» → «Москве».
  if (/[бвгджзклмнпрстфхцчшщ]а$/.test(value)) {
    return value.replace(/а$/, "е");
  }

  // «Дагестан» → «Дагестане», «Санкт-Петербург» → «Санкт-Петербурге».
  if (/[бвгдзклмнпрстфх]$/.test(value)) {
    return `${value}е`;
  }

  return value;
}

/**
 * Склонение названия города или района в предложный падеж.
 *
 * Несклоняемые названия (Сочи, Гагры) и всё, что не подошло под правила,
 * возвращаются как есть — именительный падеж лучше выдуманной формы.
 */
export function cityPrepositional(name: string | null | undefined): string {
  if (!name) return "";
  const value = name.trim();
  if (!value) return "";

  // «Ростов-на-Дону» → «Ростове-на-Дону»: склоняется только первая часть.
  const compound = value.match(/^([^-]+)(-на-.+)$/);
  if (compound) {
    return `${cityPrepositional(compound[1])}${compound[2]}`;
  }

  // Районы и округа: «Рузский район» → «Рузском районе».
  if (/ий\s+(район|округ)$/.test(value)) {
    return value.replace(/ий\s+(район|округ)$/, "ом $1е");
  }

  // «Мордовия» → «Мордовии».
  if (/ия$/.test(value)) return value.replace(/ия$/, "ии");

  // «Белокуриха» → «Белокурихе», «Йошкар-Ола» → «Йошкар-Оле».
  if (/[бвгджзклмнпрстфхцчшщ]а$/.test(value)) return value.replace(/а$/, "е");

  // «Симферополь» → «Симферополе».
  if (/ь$/.test(value)) return value.replace(/ь$/, "е");

  // «Краснодар» → «Краснодаре». Гласные на конце (Сочи, Тушино) не трогаем.
  if (/[бвгдзклмнпрстфх]$/.test(value)) return `${value}е`;

  return value;
}

/**
 * Родительный падеж для оборотов «отдых в … области» → «объекты {региона}».
 * Пока нужен только для «область» и «край»; остальное отдаём как есть.
 */
export function regionGenitive(name: string | null | undefined): string {
  if (!name) return "";
  const value = name.trim();
  if (!value) return "";

  if (EXCEPTIONS[value]) return value;
  if (value.startsWith("Республика ")) return value;

  if (/ая\s+область$/.test(value)) {
    return value.replace(/ая\s+область$/, "ой области");
  }
  if (/ий\s+край$/.test(value)) {
    return value.replace(/ий\s+край$/, "ого края");
  }
  return value;
}
