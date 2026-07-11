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
    background:
      "radial-gradient(circle at 50% 15%, rgba(255,255,255,0.1), transparent 60%), repeating-linear-gradient(90deg, #14601f 0px, #14601f 90px, #187226 90px, #187226 180px)",
    glow: "#4ade80",
    available: true,
  },
  basketball: {
    label: "Basketball",
    emoji: "🏀",
    accent: "#c2410c",
    accentSoft: "#ea580c",
    background:
      "radial-gradient(circle at 50% 15%, rgba(255,255,255,0.1), transparent 55%), linear-gradient(160deg, #7c2d12, #c2410c)",
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
