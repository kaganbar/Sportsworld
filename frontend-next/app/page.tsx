"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { TKey, useLang } from "@/lib/i18n";
import { SportKey, sportsTheme } from "@/theme/sportsTheme";
import { Game, TennisMatch, fetchBasketballGames, fetchTennisMatches, fetchTodaysGames } from "@/lib/api";
import PageShell from "@/components/page-shell";

// Home hero card mark — gradient circle + glow per sport, distinct from
// sportsTheme's ambient `glow`/`glowRgb` (wayfinding tint) since this is a
// small decorative element, not a background layer. Brief's exact values.
const SPORT_MARK: Record<SportKey, { gradient: string; glow: string }> = {
  football: { gradient: "linear-gradient(135deg,#34d399,#0ea5e9)", glow: "rgba(52,211,153,0.45)" },
  basketball: { gradient: "linear-gradient(135deg,#fb923c,#f43f5e)", glow: "rgba(251,146,60,0.45)" },
  tennis: { gradient: "linear-gradient(135deg,#2dd4bf,#38bdf8)", glow: "rgba(45,212,191,0.45)" },
};

export default function Home() {
  const { t, lang } = useLang();
  const [liveCounts, setLiveCounts] = useState<Record<SportKey, number>>({ football: 0, basketball: 0, tennis: 0 });

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTodaysGames(lang), fetchBasketballGames(lang), fetchTennisMatches(lang)])
      .then(([football, basketball, tennis]: [Game[], Game[], TennisMatch[]]) => {
        if (cancelled) return;
        setLiveCounts({
          football: football.filter((g) => g.status === "live").length,
          basketball: basketball.filter((g) => g.status === "live").length,
          tennis: tennis.filter((m) => m.status === "live").length,
        });
      })
      .catch(() => {
        /* home hero degrades to a 0 live-count badge, not an error state */
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return (
    <PageShell maxWidth="max-w-6xl">
      <div className="px-2 pb-16 pt-8 text-center">
        <div className="mb-6 inline-block rounded-full border border-[var(--brand-accent)]/35 bg-[var(--brand-accent)]/[0.08] px-4 py-1.5 text-xs font-bold tracking-widest text-[var(--brand-accent)]">
          {t("heroKicker")}
        </div>
        <h1 className="mx-auto max-w-3xl bg-[linear-gradient(135deg,#ffffff,#a9d9ff_60%,#7c5cff)] bg-clip-text text-4xl font-extrabold leading-tight tracking-tight text-transparent sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-white/60">{t("heroSubtitle")}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-6 px-2 pb-10">
        {(Object.keys(sportsTheme) as SportKey[]).map((key) => {
          const theme = sportsTheme[key];
          const mark = SPORT_MARK[key];
          const card = (
            <div className="glass-panel h-full w-[300px] rounded-[26px] p-7 text-start transition duration-300 hover:-translate-y-1.5 sm:w-[340px]">
              <div
                className="mb-5 h-16 w-16 rounded-full"
                style={{ background: mark.gradient, boxShadow: `0 0 30px ${mark.glow}` }}
              />
              <div className="mb-1.5 text-2xl font-extrabold text-white">{t(`sport_${key}` as TKey)}</div>
              <div className="mb-5 text-sm text-white/55">{t(`tagline_${key}` as TKey)}</div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--status-upcoming)]">
                <span className="live-dot h-[7px] w-[7px] rounded-full bg-[var(--brand-accent)]" />
                {liveCounts[key]} {t("liveNow")}
              </div>
            </div>
          );
          return theme.available ? (
            <Link key={key} href={`/${key}`} className="block">
              {card}
            </Link>
          ) : (
            <div key={key}>{card}</div>
          );
        })}
      </div>

      <div className="px-2 text-center">
        <Link
          href="/other-sports"
          className="glass-panel inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white/85 transition hover:text-white"
        >
          🏅 {t("otherSports")}
        </Link>
      </div>
    </PageShell>
  );
}
