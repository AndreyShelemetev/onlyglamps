import { ReactNode } from "react";

/**
 * Минималистичные монохромные SVG-иконки в едином стиле (stroke 1.5, currentColor).
 * Используются для удобств и параметров — без заливок и градиентов.
 */
type IconProps = { className?: string };

const base = "w-5 h-5 shrink-0";
const sw = (props: IconProps) => ({
  className: props.className ?? base,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

const Wifi = (p: IconProps) => (<svg {...sw(p)}><path d="M5 12.55a11 11 0 0 1 14 0"/><path d="M8.5 16.05a6 6 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 20 0"/><circle cx="12" cy="20" r="0.5" fill="currentColor"/></svg>);
const Banya = (p: IconProps) => (<svg {...sw(p)}><path d="M9 4c0 2 1 3 1 5s-1 3-1 5"/><path d="M14 4c0 2 1 3 1 5s-1 3-1 5"/><path d="M4 16h16v4H4z"/></svg>);
const Mangal = (p: IconProps) => (<svg {...sw(p)}><path d="M5 11h14l-2 9H7z"/><path d="M9 7c0-1 1-1 1-2s-1-1-1-2"/><path d="M13 7c0-1 1-1 1-2s-1-1-1-2"/></svg>);
const Parking = (p: IconProps) => (<svg {...sw(p)}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>);
const Pets = (p: IconProps) => (<svg {...sw(p)}><circle cx="5" cy="9" r="1.5"/><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="19" cy="9" r="1.5"/><path d="M12 11c-3 0-6 3-6 6 0 2 2 3 4 2.5s2-2 2-2 0 1.5 2 2 4-.5 4-2.5c0-3-3-6-6-6Z"/></svg>);
const Children = (p: IconProps) => (<svg {...sw(p)}><circle cx="12" cy="6" r="2.5"/><path d="M12 9v7"/><path d="M9 12h6"/><path d="M9 20l3-4 3 4"/></svg>);
const Kitchen = (p: IconProps) => (<svg {...sw(p)}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 11h16"/><circle cx="8" cy="7" r="0.5" fill="currentColor"/><circle cx="12" cy="7" r="0.5" fill="currentColor"/></svg>);
const Fire = (p: IconProps) => (<svg {...sw(p)}><path d="M12 21c4 0 7-3 7-7 0-3-3-5-3-9 0 0-3 1-4 5-1-1-2-2-2-4 0 0-5 3-5 8 0 4 3 7 7 7Z"/></svg>);
const Snow = (p: IconProps) => (<svg {...sw(p)}><path d="M12 3v18"/><path d="M3 12h18"/><path d="m5 5 14 14"/><path d="M19 5 5 19"/></svg>);
const Sup = (p: IconProps) => (<svg {...sw(p)}><path d="M3 16c2 1 4 1 6 0s4-1 6 0 4 1 6 0"/><path d="M5 12c2-2 5-3 7-3s5 1 7 3"/><path d="M12 4v8"/></svg>);
const Horse = (p: IconProps) => (<svg {...sw(p)}><path d="M5 19V12L4 9l3-2 4 1 6-3 1 4-2 4v6"/><circle cx="7.5" cy="6.5" r="0.5" fill="currentColor"/></svg>);
const Boards = (p: IconProps) => (<svg {...sw(p)}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01"/></svg>);
const Hammock = (p: IconProps) => (<svg {...sw(p)}><path d="M3 6l18 12"/><path d="M5 14c4-2 10-2 14 0"/></svg>);
const Sun = (p: IconProps) => (<svg {...sw(p)}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>);
const Bus = (p: IconProps) => (<svg {...sw(p)}><rect x="4" y="4" width="16" height="14" rx="2"/><path d="M4 11h16"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>);
const Compass = (p: IconProps) => (<svg {...sw(p)}><circle cx="12" cy="12" r="9"/><path d="m9 15 2-6 4-2-2 6Z"/></svg>);
const Fridge = (p: IconProps) => (<svg {...sw(p)}><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 11h12"/><path d="M9 7v1M9 14v1"/></svg>);
const Microwave = (p: IconProps) => (<svg {...sw(p)}><rect x="3" y="5" width="18" height="14" rx="2"/><rect x="6" y="8" width="9" height="8"/><circle cx="18" cy="9" r="0.5" fill="currentColor"/></svg>);
const Kettle = (p: IconProps) => (<svg {...sw(p)}><path d="M5 11h13l-1 9H6Z"/><path d="M18 13l3-2v3z"/><path d="M9 8c0-2 1-3 3-3"/></svg>);
const House = (p: IconProps) => (<svg {...sw(p)}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>);
const Bed = (p: IconProps) => (<svg {...sw(p)}><path d="M3 18V8h13a4 4 0 0 1 4 4v6"/><path d="M3 13h17"/><circle cx="7" cy="11" r="1.5"/></svg>);
const Ruler = (p: IconProps) => (<svg {...sw(p)}><rect x="2" y="9" width="20" height="6" rx="1"/><path d="M6 9v3M10 9v3M14 9v3M18 9v3"/></svg>);
const Clock = (p: IconProps) => (<svg {...sw(p)}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
const Smoke = (p: IconProps) => (<svg {...sw(p)}><rect x="3" y="14" width="14" height="4" rx="1"/><path d="M19 14v4M21 14v4"/><path d="M7 11c0-2 2-2 2-4s-2-2-2-4"/><path d="M12 11c0-1 1-1 1-2s-1-1-1-2"/></svg>);
const Party = (p: IconProps) => (<svg {...sw(p)}><path d="m4 20 6-14 8 8z"/><path d="M14 6c1 0 2-1 2-2"/><path d="M18 10c1 0 2-1 2-2"/><circle cx="14" cy="10" r="0.5" fill="currentColor"/></svg>);
const Default = (p: IconProps) => (<svg {...sw(p)}><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>);

const map: Record<string, (p: IconProps) => ReactNode> = {
  wifi: Wifi,
  banya: Banya,
  chan: Banya,
  mangal: Mangal,
  parkovka: Parking,
  parking: Parking,
  besedka: House,
  "u-vody": Sup,
  "u-lesa": Compass,
  "s-pitomtsami": Pets,
  "s-detmi": Children,
  kuhnya: Kitchen,
  "kostrovaya-zona": Fire,
  shezlongi: Sun,
  "shezlongi-na-obshchey-territorii": Sun,
  gamaki: Hammock,
  "gamaki-i-kacheli-na-obshchey-territorii": Hammock,
  mikrovolnovka: Microwave,
  "mikrovolnovaya-pech": Microwave,
  kholodilnik: Fridge,
  chaynik: Kettle,
  "sup-serf": Sup,
  lyzhi: Snow,
  "konnye-progulki": Horse,
  "nastolnye-igry": Boards,
  ekskursii: Compass,
  transfer: Bus,
  "ves-obekt": House,
};

/**
 * Возвращает <Icon /> по slug удобства. Fallback — нейтральный «check».
 */
export function AmenityIcon({ slug, className }: { slug: string; className?: string }) {
  const Cmp = map[slug] ?? Default;
  return <Cmp className={className} />;
}

export const Icons = {
  Wifi, Banya, Mangal, Parking, Pets, Children, Kitchen, Fire, Snow, Sup, Horse,
  Boards, Hammock, Sun, Bus, Compass, Fridge, Microwave, Kettle, House, Bed, Ruler,
  Clock, Smoke, Party, Default,
};
