// Per-sport theme registry. Adding a sport = adding an entry here;
// components only consume the CSS variables set by ThemeLayout.
export const sportsTheme = {
  football: {
    label: "Football",
    emoji: "⚽",
    accent: "#1e7b34",
    accentSoft: "#2ea44f",
    // Layered stripes = stadium grass (no image asset needed), plus a soft
    // radial highlight suggesting overhead floodlights — the CSS fallback
    // when WebGL/3D isn't available, and also what shows through the 3D
    // canvas's empty (alpha) regions. Kept close to the original brightness
    // deliberately: ThemeLayout's own scrim is what handles "darkened for
    // readability" now — stacking a second, independently-darkened base
    // color under that scrim crushed everything toward solid black.
    // The added far-edge vignette (a dark, cool near-black) ties football's
    // background into the same "Galaxy" dark-edge family basketball/tennis
    // already have, without touching the visible grass band's brightness.
    background:
      "radial-gradient(circle at 50% 15%, rgba(255,255,255,0.1), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(5,5,15,0.55), transparent 60%), repeating-linear-gradient(90deg, #14601f 0px, #14601f 90px, #187226 90px, #187226 180px)",
    glow: "#4ade80",
    available: true,
  },
  basketball: {
    label: "Basketball",
    emoji: "🏀",
    accent: "#c2410c",
    accentSoft: "#ea580c",
    // Dark stop nudged from a warm brown toward a cooler, less-saturated
    // near-black so its far-edge luminance family matches tennis's navy
    // (both now read as "Galaxy dark," not two unrelated tones) — the
    // dominant wood-orange identity color is untouched.
    background:
      "radial-gradient(circle at 50% 15%, rgba(255,255,255,0.1), transparent 55%), linear-gradient(160deg, #241710, #c2410c)",
    glow: "#fb923c",
    available: true,
  },
  tennis: {
    label: "Tennis",
    emoji: "🎾",
    accent: "#1d4ed8",
    accentSoft: "#3b82f6",
    background:
      "radial-gradient(circle at 50% 15%, rgba(255,255,255,0.1), transparent 55%), linear-gradient(160deg, #1e3a8a, #1d4ed8)",
    glow: "#60a5fa",
    available: true,
  },
} as const;

export type SportKey = keyof typeof sportsTheme;

// "Other Sports" sub-menu — navigation scaffolding only for now (no backend
// models/agents yet), same shape/pattern as sportsTheme so building these out
// later is additive, not a restructure.
export const otherSportsTheme = {
  baseball: {
    label: "Baseball",
    emoji: "⚾",
    accent: "#b91c1c",
    accentSoft: "#dc2626",
    background: "linear-gradient(160deg, #78350f, #b91c1c)",
    available: false,
  },
  volleyball: {
    label: "Volleyball",
    emoji: "🏐",
    accent: "#ca8a04",
    accentSoft: "#eab308",
    background: "linear-gradient(160deg, #713f12, #ca8a04)",
    available: false,
  },
} as const;

export type OtherSportKey = keyof typeof otherSportsTheme;

// Optional per-competition accent override (keyed by the Competition slug
// from the backend, flat across all sports since slugs already read
// unambiguously — "champions-league" only exists under football). Additive,
// not a restructure: ThemeLayout falls back to the sport's own accent when
// a slug has no entry here. Deliberately a color-only override, not a new
// 3D scene — marquee competitions get a distinct brand feel without a new
// asset/scene per competition.
export const competitionAccents: Partial<Record<string, string>> = {
  "champions-league": "#0c2d6b",
  "premier-league": "#3d1560",
  "la-liga": "#ee3524",
  "world-cup": "#ffcc00",
  nba: "#c8102e",
  wimbledon: "#520c3c",
  "atp-tour": "#004b8d",
  "wta-tour": "#7209b7",
};
