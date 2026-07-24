"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLang, type TKey } from "@/lib/i18n";
import { SportKey, sportsTheme } from "@/theme/sportsTheme";
import { GamesSection } from "./games-section";
import { RankingsSection } from "./rankings-section";
import { StandingsSection } from "./standings-section";
import { TennisSection } from "./tennis-section";

const TAGLINE_KEY: Record<SportKey, TKey> = {
  football: "tagline_football",
  basketball: "tagline_basketball",
  tennis: "tagline_tennis",
  baseball: "tagline_baseball",
  volleyball: "tagline_volleyball",
};

/**
 * A sport's landing page: a header (glowing glyph, translated name, tagline)
 * over today's fixtures. Tennis renders the player-vs-player TennisSection;
 * every other sport renders the team GamesSection. Shared by all five sport
 * routes so they stay visually consistent.
 */
export function SportLanding({ sport }: { sport: SportKey }) {
  const { t } = useLang();
  const s = sportsTheme[sport];
  const isTennis = sport === "tennis";
  // Top-level view: fixtures vs the league table (tennis: rankings).
  const [view, setView] = useState<"games" | "table">("games");

  const viewTabs: { key: "games" | "table"; label: string }[] = [
    { key: "games", label: t("todaysGames") },
    { key: "table", label: t(isTennis ? "tab_rankings" : "tab_standings") },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 md:py-16">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10 flex items-center gap-4"
      >
        <span
          className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-4xl ring-1 ring-inset ring-white/10"
          style={{ background: `${s.accent}14`, boxShadow: `0 0 44px -12px ${s.glow}` }}
        >
          {s.icon}
        </span>
        <div>
          <h1 className="font-display text-4xl tracking-wide text-[color:var(--chalk)] sm:text-5xl">
            {t(s.labelKey)}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--chalk-dim)]">{t(TAGLINE_KEY[sport])}</p>
        </div>
      </motion.header>

      {/* View switch */}
      <div className="mb-6 flex gap-2 border-b border-white/10">
        {viewTabs.map((vt) => {
          const active = view === vt.key;
          return (
            <button
              key={vt.key}
              type="button"
              onClick={() => setView(vt.key)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-[color:var(--brand-accent)] text-[color:var(--chalk)]"
                  : "border-transparent text-[color:var(--chalk-dim)] hover:text-[color:var(--chalk)]"
              }`}
            >
              {vt.label}
            </button>
          );
        })}
      </div>

      {view === "games" ? (
        isTennis ? (
          <TennisSection />
        ) : (
          <GamesSection sport={sport} />
        )
      ) : isTennis ? (
        <RankingsSection />
      ) : (
        <StandingsSection sport={sport} />
      )}
    </main>
  );
}
