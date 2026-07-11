"use client";

import { CSSProperties, ReactNode } from "react";
import dynamic from "next/dynamic";

import { TKey, useLang } from "@/lib/i18n";
import { SportKey, sportsTheme } from "@/theme/sportsTheme";
import { Badge } from "@/components/ui/badge";

// next/dynamic with ssr:false is the actual "client-only, never rendered on
// the server" boundary in Next.js — SportBackgroundCanvas touches
// `document`/WebGL at call time and would crash under the default SSR pass
// otherwise. Still the same code-split boundary the Vite app had (three.js
// stays out of the main bundle until a themed sport page renders).
const SportBackgroundCanvas = dynamic(() => import("@/three/SportBackgroundCanvas"), { ssr: false });

// Sets the per-sport CSS variables; everything inside styles itself off them.
export default function ThemeLayout({ sport, children }: { sport: SportKey; children: ReactNode }) {
  const theme = sportsTheme[sport];
  const { t } = useLang();
  return (
    <div
      className="relative z-0 min-h-screen pb-16"
      style={
        {
          background: theme.background,
          "--sport-accent": theme.accent,
          "--sport-accent-soft": theme.accentSoft,
          "--sport-glow": theme.glow,
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

      <div className="relative flex items-center justify-center border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-sm">
        <Badge className="bg-white/15 text-white" variant="outline">
          {theme.emoji} {t(`sport_${sport}` as TKey)}
        </Badge>
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
