import type { TKey } from "@/lib/i18n";

/**
 * Sport registry (rebuilt from scratch, Phase 2) — the single source of truth
 * for every sport the app knows about: its route, its display-name i18n key,
 * its nav grouping, and its accent/glow colors in the new "floodlit pitch"
 * design language.
 *
 * This module deliberately re-exports the same `SportKey` type and a
 * `sportsTheme` record with a `.glow` field that the preserved lib/ and three/
 * code already import (lib/homeFeed.ts, lib/sportWorld.ts, three/Nebula.tsx) —
 * the Phase 1 theme/ wipe removed the old file out from under them. The color
 * values are new; the shape is kept compatible so those files keep working
 * without edits.
 */
export type SportKey =
  | "football"
  | "basketball"
  | "tennis"
  | "baseball"
  | "volleyball";

export interface SportTheme {
  /** i18n key for the sport's display name (sport_football, …). */
  labelKey: TKey;
  /** App route for the sport's landing page. */
  route: string;
  /** Emoji glyph used in the nav rail. */
  icon: string;
  /** Primary sports get top-level nav entries; "other" are grouped. */
  group: "primary" | "other";
  /** Accent color for the sport (borders, active states). */
  accent: string;
  /** Glow color — consumed by three/Nebula.tsx's zone-transition gradient. */
  glow: string;
}

export const sportsTheme: Record<SportKey, SportTheme> = {
  football: {
    labelKey: "sport_football",
    route: "/football",
    icon: "⚽",
    group: "primary",
    accent: "#37E88B", // spring green — ties to the pitch Hero
    glow: "#C6FF4A", // electric lime floodlight
  },
  basketball: {
    labelKey: "sport_basketball",
    route: "/basketball",
    icon: "🏀",
    group: "primary",
    accent: "#FF8A3D", // hardwood orange
    glow: "#FF6A2A",
  },
  tennis: {
    labelKey: "sport_tennis",
    route: "/tennis",
    icon: "🎾",
    group: "primary",
    accent: "#D8F14A", // tennis-ball yellow-green
    glow: "#C6FF4A",
  },
  baseball: {
    labelKey: "sport_baseball",
    route: "/baseball",
    icon: "⚾",
    group: "other",
    accent: "#FF5D5D", // clay red
    glow: "#FF5D5D",
  },
  volleyball: {
    labelKey: "sport_volleyball",
    route: "/volleyball",
    icon: "🏐",
    group: "other",
    accent: "#4AD8FF", // court cyan
    glow: "#4AD8FF",
  },
};

/** Ordered sport keys for stable nav rendering. */
export const SPORT_ORDER: SportKey[] = [
  "football",
  "basketball",
  "tennis",
  "baseball",
  "volleyball",
];
