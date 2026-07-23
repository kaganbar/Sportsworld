// Basketball position-code translations — a standalone module rather than
// an addition to i18n.tsx's `translations` object/TKey union (see the
// comment on translateFootballPosition in lib/i18n.tsx): this and the
// football helper were written concurrently by two different tasks, so
// keeping basketball's lookup in its own file/function avoids both edits
// colliding on the same lines or the same exported name.
//
// Two distinct vocabularies feed this one lookup:
//  - This app's own simulated squads (BASKETBALL_SQUAD_TEMPLATE in
//    prisma/seed.ts): fine-grained PG/SG/SF/PF/C codes.
//  - Real balldontlie rosters (prisma/enrich-balldontlie-rosters.ts),
//    confirmed live against GET /v1/players: coarser codes — "G", "F", "C"
//    alone, or a hyphenated combo for players balldontlie lists at two
//    spots (e.g. "G-F", "F-C") — balldontlie doesn't distinguish PG from
//    SG or SF from PF the way this app's own seed data does, so those stay
//    untranslated at the finer granularity, not fabricated.
//
// Deliberately keyed by lowercase code with an {en, he} pair each, not
// wired through i18n.tsx's t()/TKey — this function takes `lang` directly
// so callers don't need a `TKey`-typed key for something that was never a
// static UI string. "c" is intentionally scoped to basketball-only
// callers: baseball's own Player.position vocabulary (P/C/IF/OF/DH, see
// baseballSeasonStats in prisma/seed.ts) also uses "C" for catcher, which
// would collide with basketball's "C" (center) if this were ever called
// for a non-basketball sport — every call site in this app gates on
// sport === "basketball" before calling this, see key-player-card.tsx,
// player-profile-card.tsx, and team-sport-game-detail.tsx.
const BASKETBALL_POSITION_LABELS: Record<string, { en: string; he: string }> = {
  pg: { en: "Point Guard", he: "רכז" },
  sg: { en: "Shooting Guard", he: "קלע" },
  sf: { en: "Small Forward", he: "סמול פורוורד" },
  pf: { en: "Power Forward", he: "פאוור פורוורד" },
  c: { en: "Center", he: "סנטר" },
  g: { en: "Guard", he: "גארד" },
  f: { en: "Forward", he: "פורוורד" },
  "g-f": { en: "Guard-Forward", he: "גארד-פורוורד" },
  "f-g": { en: "Guard-Forward", he: "גארד-פורוורד" },
  "f-c": { en: "Forward-Center", he: "פורוורד-סנטר" },
  "c-f": { en: "Forward-Center", he: "פורוורד-סנטר" },
};

export function translateBasketballPosition(lang: "en" | "he", position: string): string {
  const entry = BASKETBALL_POSITION_LABELS[position.toLowerCase()];
  if (!entry) return position;
  return entry[lang];
}
