/**
 * Full-bleed football-pitch backdrop for the Hero.
 *
 * Four stacked layers, back to front:
 *   1. Floodlit vignette — radial gradient, lit turf at center → near-black at
 *      the edges, so the pitch feels lit by stadium lights rather than flat.
 *   2. Mow stripes — faint alternating vertical bands (the groundskeeper's
 *      mower pattern), just enough to read as grass, not a solid fill.
 *   3. Grain — an inline feTurbulence noise texture at low opacity for a
 *      close-up grass/tactile feel (no external asset).
 *   4. Markings — a top-down portrait pitch (boundary, halfway line, center
 *      circle, both penalty + goal areas, penalty spots) in chalk-faint white.
 *
 * Purely decorative: aria-hidden, pointer-events-none, sits behind content.
 * Colors reference the CSS vars in globals.css (mirror of theme/tokens.ts).
 */

// Inline SVG noise as a data URI — a fractal-noise turbulence tile. Kept inline
// so there's no network fetch / public asset to manage.
const NOISE_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function PitchBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 1. Floodlit vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 42%, var(--pitch-lit) 0%, var(--pitch-base) 42%, var(--pitch-deep) 74%, var(--pitch-edge) 100%)",
        }}
      />

      {/* 2. Mow stripes — alternating vertical bands, very subtle */}
      <div
        className="absolute inset-0 opacity-[0.55] mix-blend-soft-light"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--pitch-stripe) 0 8%, transparent 8% 16%)",
        }}
      />

      {/* 3. Grain */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: NOISE_DATA_URI, backgroundSize: "160px 160px" }}
      />

      {/* 4. Chalk markings — top-down portrait pitch (viewBox 68 x 105, real
          FIFA proportions rotated to portrait). Slice-scaled to cover. */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 68 105"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="var(--chalk-faint)"
        strokeWidth="0.3"
      >
        {/* Outer boundary */}
        <rect x="4" y="4" width="60" height="97" rx="0.5" />
        {/* Halfway line + center circle + spot */}
        <line x1="4" y1="52.5" x2="64" y2="52.5" />
        <circle cx="34" cy="52.5" r="9.15" />
        <circle cx="34" cy="52.5" r="0.5" fill="var(--chalk-faint)" stroke="none" />

        {/* Top penalty + goal area */}
        <rect x="13.85" y="4" width="40.3" height="16.5" />
        <rect x="24.85" y="4" width="18.3" height="5.5" />
        <circle cx="34" cy="15" r="0.5" fill="var(--chalk-faint)" stroke="none" />
        <path d="M 26.7 20.5 A 9.15 9.15 0 0 0 41.3 20.5" />

        {/* Bottom penalty + goal area (mirror) */}
        <rect x="13.85" y="84.5" width="40.3" height="16.5" />
        <rect x="24.85" y="95.5" width="18.3" height="5.5" />
        <circle cx="34" cy="90" r="0.5" fill="var(--chalk-faint)" stroke="none" />
        <path d="M 26.7 84.5 A 9.15 9.15 0 0 1 41.3 84.5" />

        {/* Corner arcs */}
        <path d="M 4 5.5 A 1.5 1.5 0 0 0 5.5 4" />
        <path d="M 62.5 4 A 1.5 1.5 0 0 0 64 5.5" />
        <path d="M 4 99.5 A 1.5 1.5 0 0 1 5.5 101" />
        <path d="M 62.5 101 A 1.5 1.5 0 0 1 64 99.5" />
      </svg>
    </div>
  );
}
