/**
 * SportsWorld design system — source of truth (rebuilt from scratch, Phase 1).
 *
 * The old theme/ (sportsTheme.ts / statSchema.ts) was deliberately wiped; this
 * is its intentional replacement. These tokens are the canonical values for the
 * new "floodlit pitch" look. They are mirrored 1:1 as CSS custom properties in
 * app/globals.css (the `:root` block) so Tailwind's `hsl(var(--x))` utilities
 * and raw CSS both draw from the same palette — when a value changes, change it
 * in BOTH places. Components import from here for values that don't map cleanly
 * onto a Tailwind class (SVG stroke colors, gradient stops, animation timing).
 */

/**
 * Palette — a premium, floodlit night-match pitch: deep near-black greens under
 * stadium light, chalk-white markings, and an electric lime→spring-green accent
 * that reads like grass caught in a floodlight. Deliberately NOT default
 * Tailwind green (#22c55e / #4ade80).
 */
export const palette = {
  // Pitch — layered dark greens, darkest at the edges (vignette) to lit center.
  pitch: {
    edge: "#06140c", // deepest, near-black forest — page/vignette edges
    deep: "#0a1f14", // base turf in shadow
    base: "#0e2a1a", // primary pitch fill
    lit: "#123a22", // grass under floodlight (mow-stripe highlight)
    stripe: "#0c2417", // alternate mow stripe (subtly darker than `base`)
  },
  // Chalk — the white of pitch markings and the wordmark. Warm, not pure #fff,
  // so it reads like lime paint on grass rather than a UI white.
  chalk: {
    DEFAULT: "#F2F6EC",
    dim: "rgba(242, 246, 236, 0.62)", // secondary text / faint markings
    faint: "rgba(242, 246, 236, 0.10)", // hairline pitch lines in the bg
  },
  // Accent — the electric floodlit-grass gradient. `accent` is the brighter
  // lime; `accent2` the spring green it fades into. Text on top of the accent
  // is `onAccent` (near-black green) for contrast.
  accent: "#C6FF4A",
  accent2: "#37E88B",
  onAccent: "#06140c",
} as const;

/** Typography — Anton for the display wordmark, Rubik for everything else. */
export const typography = {
  // These NAMES must match the CSS-variable font bindings in app/layout.tsx
  // (next/font) and the fontFamily entries in tailwind.config.ts.
  displayVar: "var(--font-anton)", // condensed, heavy — the SportsWorld logo
  sansVar: "var(--font-rubik)", // humanist sans w/ full Hebrew glyph coverage
  // Wide tracking makes the condensed Anton wordmark feel engineered/sporty.
  wordmarkTracking: "0.02em",
} as const;

/**
 * Spacing scale — a 4px base rhythm with named steps for page-level layout.
 * (Component-internal spacing uses Tailwind's own scale; these are the larger
 * structural values the Hero and future sections align to.)
 */
export const spacing = {
  gutter: "clamp(1.25rem, 5vw, 4rem)", // page side padding, fluid
  sectionY: "clamp(3rem, 10vh, 8rem)", // vertical rhythm between sections
} as const;

/** Motion — shared easing/timing so entrance animations feel like one system. */
export const motion = {
  // A gentle "settle" ease-out — decisive start, soft landing. Used for the
  // wordmark entrance and reused by later reveal animations.
  easeSettle: [0.16, 1, 0.3, 1] as const,
  wordmarkDuration: 1.1,
} as const;
