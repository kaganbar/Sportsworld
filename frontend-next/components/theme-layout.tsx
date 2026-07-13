"use client";

import { CSSProperties, ReactNode } from "react";
import dynamic from "next/dynamic";

import { TKey, useLang } from "@/lib/i18n";
import { SportKey, sportsTheme } from "@/theme/sportsTheme";
import { HeaderBadge } from "@/components/header-badge";

// next/dynamic with ssr:false is the actual "client-only, never rendered on
// the server" boundary in Next.js — SportBackgroundCanvas touches
// `document`/WebGL at call time and would crash under the default SSR pass
// otherwise. Still the same code-split boundary the Vite app had (three.js
// stays out of the main bundle until a themed sport page renders).
const SportBackgroundCanvas = dynamic(() => import("@/three/SportBackgroundCanvas"), { ssr: false });

// Sets the per-sport CSS variables; everything inside styles itself off them.
// `competitionAccent`/`competitionLabel` are optional overrides for a
// competition hub page (e.g. Champions League's own blue/silver instead of
// generic football green) — additive, not a new 3D scene (see
// theme/sportsTheme.ts's competitionAccents comment).
export default function ThemeLayout({
  sport,
  competitionAccent,
  competitionLabel,
  children,
}: {
  sport: SportKey;
  competitionAccent?: string;
  competitionLabel?: string;
  children: ReactNode;
}) {
  const theme = sportsTheme[sport];
  const { t } = useLang();
  const accent = competitionAccent ?? theme.accent;
  return (
    <div
      className="relative z-0 min-h-screen pb-16"
      style={
        {
          background: theme.background,
          "--sport-accent": accent,
          "--sport-accent-soft": theme.accentSoft,
          "--sport-glow": competitionAccent ?? theme.glow,
        } as CSSProperties
      }
    >
      <SportBackgroundCanvas sport={sport} />

      {/* Scrim: keeps the interface readable over a busier 3D background —
          always present, distinct from the header strip's own blur below.
          fixed (not absolute) for the same reason as the canvas itself —
          pinned to the viewport, not stretched across a tall scrollable
          page. */}
      <div className="pointer-events-none fixed inset-0 -z-[5] bg-gradient-to-b from-black/30 via-black/10 to-black/35 backdrop-blur-[2px]" />

      <HeaderBadge icon={theme.emoji} label={t(`sport_${sport}` as TKey)} sub={competitionLabel} />

      <div className="relative mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
