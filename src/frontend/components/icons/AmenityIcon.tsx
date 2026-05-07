// Outline-иконки для удобств. Все 24x24, currentColor, stroke 1.5 — единый «hand-drawn» стиль.
// Подбор по ключевым словам в slug — остальное падает к универсальной иконке.

type IconProps = { className?: string };

const I = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const ICONS: Record<string, React.ReactNode> = {
  wifi: (<><path d="M5 12.55a11 11 0 0 1 14 0" /><path d="M8.5 16.05a6 6 0 0 1 7 0" /><path d="M2 8.82a15 15 0 0 1 20 0" /><circle cx="12" cy="20" r="0.5" fill="currentColor" /></>),
  banya: (<><path d="M4 21V10l8-6 8 6v11" /><path d="M9 21v-6h6v6" /><path d="M8 7c0-1 1-1 1-2s-1-1-1-2" /><path d="M12 7c0-1 1-1 1-2s-1-1-1-2" /></>),
  chan: (<><path d="M5 8h14l-1 11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 8Z" /><path d="M3 8h18" /><path d="M9 4c0 1 1 1 1 2s-1 1-1 2" /><path d="M14 4c0 1 1 1 1 2s-1 1-1 2" /></>),
  mangal: (<><path d="M4 11h16l-2 7H6l-2-7Z" /><path d="M2 11h20" /><path d="M9 7c0-1 1-1 1-2" /><path d="M13 7c0-1 1-1 1-2" /><path d="M17 7c0-1 1-1 1-2" /></>),
  parkovka: (<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 17V8h3.5a3 3 0 0 1 0 6H9" /></>),
  besedka: (<><path d="M3 11 12 4l9 7" /><path d="M5 11v9h14v-9" /><path d="M9 20v-5h6v5" /></>),
  kuhnya: (<><path d="M6 3h12v6a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V3Z" /><path d="M9 12v9" /><path d="M15 12v9" /><path d="M3 21h18" /></>),
  kostrovaya: (<><path d="M12 3c2 3 5 5 5 9a5 5 0 1 1-10 0c0-3 3-5 5-9Z" /><path d="M4 21h16" /><path d="m6 21 3-3" /><path d="m18 21-3-3" /></>),
  shezlongi: (<><path d="M3 18h18" /><path d="M5 18 9 7l8 4" /><path d="M19 18v-3" /></>),
  gamaki: (<><path d="M3 16c4-1 14-1 18 0" /><path d="M5 5v3" /><path d="M19 5v3" /><path d="M5 8c4-2 10-2 14 0" /></>),
  mikrovolnovka: (<><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M14 5v14" /><circle cx="17.5" cy="16" r="0.5" fill="currentColor" /><path d="M6 9h5" /><path d="M6 12h5" /></>),
  kholodilnik: (<><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M6 10h12" /><path d="M9 6v2" /><path d="M9 13v3" /></>),
  chaynik: (<><path d="M5 11h12l-1 8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 11Z" /><path d="M17 13h2a2 2 0 0 1 0 4h-2" /><path d="M9 8c0-2 2-2 2-4" /></>),
  sup: (<><path d="M3 16c3-1 15-1 18 0" /><path d="M5 12c3-6 11-6 14 0" /><path d="M11 6h2" /></>),
  lyzhi: (<><path d="m4 20 16-16" /><path d="m6 18 4-4" /><path d="m10 14 4-4" /><path d="m14 10 4-4" /></>),
  igry: (<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="1" fill="currentColor" /><circle cx="15" cy="9" r="1" fill="currentColor" /><circle cx="9" cy="15" r="1" fill="currentColor" /><circle cx="15" cy="15" r="1" fill="currentColor" /></>),
  ekskursii: (<><path d="M12 3 4 7v6c0 4 4 7 8 8 4-1 8-4 8-8V7l-8-4Z" /><path d="m9 12 2 2 4-4" /></>),
  konnye: (<><path d="M5 18c0-3 2-5 5-5h2l3-3 4 1-2 4-3 1v5" /><path d="M5 18v3" /><path d="M14 18v3" /></>),
  transfer: (<><rect x="3" y="6" width="18" height="11" rx="2" /><circle cx="8" cy="19" r="1.5" /><circle cx="16" cy="19" r="1.5" /><path d="M3 12h18" /></>),
  pets: (<><circle cx="6" cy="10" r="2" /><circle cx="10" cy="6" r="2" /><circle cx="14" cy="6" r="2" /><circle cx="18" cy="10" r="2" /><path d="M9 18c0-3 2-4 3-4s3 1 3 4-1 3-3 3-3 0-3-3Z" /></>),
  deti: (<><circle cx="12" cy="6" r="3" /><path d="M9 21v-7l-3-3 2-2 4 3 4-3 2 2-3 3v7" /></>),
  voda: (<><path d="M3 18c2-1 3 1 5 0s3-1 5 0 3 1 5 0 3-1 3 0" /><path d="M3 14c2-1 3 1 5 0s3-1 5 0 3 1 5 0 3-1 3 0" /><path d="M3 10c2-1 3 1 5 0s3-1 5 0 3 1 5 0 3-1 3 0" /></>),
  les: (<><path d="m12 3-5 8h3l-3 5h10l-3-5h3l-5-8Z" /><path d="M12 16v5" /></>),
  defaultIcon: (<><circle cx="12" cy="12" r="9" /><path d="m9 12 2 2 4-4" /></>),
};

const KEY_RULES: { match: RegExp; key: keyof typeof ICONS }[] = [
  { match: /wifi|wi-fi|internet/i, key: "wifi" },
  { match: /banya|sauna|баня|сауна/i, key: "banya" },
  { match: /chan|kupel|купел|чан/i, key: "chan" },
  { match: /mangal|мангал|barbeku/i, key: "mangal" },
  { match: /parkovka|парков/i, key: "parkovka" },
  { match: /besedka|беседк/i, key: "besedka" },
  { match: /kuhn|кухн/i, key: "kuhnya" },
  { match: /kostr|костр/i, key: "kostrovaya" },
  { match: /shezlong|шезлонг/i, key: "shezlongi" },
  { match: /gamak|kacheli|качел|гамак/i, key: "gamaki" },
  { match: /mikrovoln|микроволн/i, key: "mikrovolnovka" },
  { match: /kholodil|холодил/i, key: "kholodilnik" },
  { match: /chaynik|чайник/i, key: "chaynik" },
  { match: /sup-?serf|sup/i, key: "sup" },
  { match: /lyzh|лыж/i, key: "lyzhi" },
  { match: /nastoln|игр/i, key: "igry" },
  { match: /ekskurs|экскурс/i, key: "ekskursii" },
  { match: /konn|лошад/i, key: "konnye" },
  { match: /transfer|трансфер/i, key: "transfer" },
  { match: /pitomts|питомц|sobakam|собак/i, key: "pets" },
  { match: /det[ия]|с детьми|s-detmi/i, key: "deti" },
  { match: /u-vody|reka|более|озер/i, key: "voda" },
  { match: /u-lesa|les|лес/i, key: "les" },
];

export function AmenityIcon({ slug, name, className = "w-4 h-4" }: { slug: string; name?: string; className?: string }) {
  const probe = `${slug} ${name ?? ""}`;
  const rule = KEY_RULES.find((r) => r.match.test(probe));
  const node = ICONS[rule?.key ?? "defaultIcon"];
  return <span className={className}>{I(node)}</span>;
}
