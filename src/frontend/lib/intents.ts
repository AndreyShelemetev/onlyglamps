/**
 * Сценарные подборки («идеи для отдыха»).
 * Ведут на региональные страницы под GET-фильтром, поэтому целевые URL
 * всегда noindex,follow — см. listingRobots в lib/seo.
 */
export interface IntentChip {
  label: string;
  emoji: string;
  param: string;
}

const CHIPS = {
  chan: { label: "С горячим чаном", emoji: "♨️", param: "chan=1" },
  sauna: { label: "С баней", emoji: "🧖", param: "sauna=1" },
  mangal: { label: "С мангалом", emoji: "🔥", param: "mangal=1" },
  water: { label: "У воды", emoji: "💧", param: "u-vody=1" },
  forest: { label: "В лесу", emoji: "🌲", param: "u-lesa=1" },
  pets: { label: "Можно с питомцами", emoji: "🐾", param: "s-pitomtsami=1" },
  children: { label: "Для детей", emoji: "🧸", param: "s-detmi=1" },
  wifi: { label: "Wi-Fi", emoji: "📶", param: "wifi=1" },
  parking: { label: "Парковка", emoji: "🅿️", param: "parkovka=1" },
} satisfies Record<string, IntentChip>;

/** Плитка на главной — 6 позиций в сетке. */
export const HOME_INTENTS: IntentChip[] = [
  CHIPS.chan,
  CHIPS.sauna,
  CHIPS.water,
  CHIPS.forest,
  CHIPS.pets,
  CHIPS.mangal,
];

/** Полный набор в SEO-подвале региона. */
export const REGION_INTENTS: IntentChip[] = [
  CHIPS.chan,
  CHIPS.sauna,
  CHIPS.mangal,
  CHIPS.water,
  CHIPS.forest,
  CHIPS.pets,
  CHIPS.children,
  CHIPS.wifi,
  CHIPS.parking,
];
