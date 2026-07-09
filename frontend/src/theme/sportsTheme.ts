// Per-sport theme registry. Adding a sport = adding an entry here;
// components only consume the CSS variables set by ThemeLayout.
export const sportsTheme = {
  football: {
    label: "Football",
    emoji: "⚽",
    accent: "#1e7b34",
    accentSoft: "#2ea44f",
    // layered stripes = stadium grass, no image asset needed
    background:
      "repeating-linear-gradient(90deg, #14601f 0px, #14601f 90px, #187226 90px, #187226 180px)",
    available: true,
  },
  basketball: {
    label: "Basketball",
    emoji: "🏀",
    accent: "#c2410c",
    accentSoft: "#ea580c",
    background: "linear-gradient(160deg, #7c2d12, #c2410c)",
    available: true,
  },
  tennis: {
    label: "Tennis",
    emoji: "🎾",
    accent: "#1d4ed8",
    accentSoft: "#3b82f6",
    background: "linear-gradient(160deg, #1e3a8a, #1d4ed8)",
    available: true,
  },
} as const;

export type SportKey = keyof typeof sportsTheme;
