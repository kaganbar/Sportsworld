"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { TKey, useLang } from "@/lib/i18n";
import { SportKey, sportsTheme } from "@/theme/sportsTheme";
import {
  Game,
  TennisMatch,
  fetchBaseballGames,
  fetchBasketballGames,
  fetchTennisMatches,
  fetchTodaysGames,
  fetchVolleyballGames,
} from "@/lib/api";
import { EMPTY_HOME_FEED, HomeFeed, flattenHomeFeed, pickFeatured } from "@/lib/homeFeed";
import PageShell from "@/components/page-shell";
import FeaturedMatchHero from "@/components/featured-match-hero";
import LiveTrackerWidget from "@/components/live-tracker-widget";
import NewsTicker from "@/components/news-ticker";
import GlobalCoverageGlobe from "@/components/global-coverage-globe";

// Home hero card mark — gradient circle + glow per sport, distinct from
// sportsTheme's ambient `glow`/`glowRgb` (wayfinding tint) since this is a
// small decorative element, not a background layer. Brief's exact values.
const SPORT_MARK: Record<SportKey, { gradient: string; glow: string }> = {
  football: { gradient: "linear-gradient(135deg,#34d399,#0ea5e9)", glow: "rgba(52,211,153,0.45)" },
  basketball: { gradient: "linear-gradient(135deg,#fb923c,#f43f5e)", glow: "rgba(251,146,60,0.45)" },
  tennis: { gradient: "linear-gradient(135deg,#2dd4bf,#38bdf8)", glow: "rgba(45,212,191,0.45)" },
  baseball: { gradient: "linear-gradient(135deg,#f87171,#b91c1c)", glow: "rgba(248,113,113,0.45)" },
  volleyball: { gradient: "linear-gradient(135deg,#fbbf24,#ca8a04)", glow: "rgba(251,191,36,0.45)" },
};

export default function Home() {
  const { t, lang } = useLang();
  // Full per-sport game/match arrays (not just counts) — a single shared
  // fetch feeds liveCounts below AND FeaturedMatchHero/LiveTrackerWidget, so
  // this page's 5 today-endpoints are only ever hit once per load/lang
  // change rather than once for the count badges and again for the hero.
  const [feed, setFeed] = useState<HomeFeed>(EMPTY_HOME_FEED);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    Promise.all([
      fetchTodaysGames(lang),
      fetchBasketballGames(lang),
      fetchTennisMatches(lang),
      fetchBaseballGames(lang),
      fetchVolleyballGames(lang),
    ])
      .then(([football, basketball, tennis, baseball, volleyball]: [Game[], Game[], TennisMatch[], Game[], Game[]]) => {
        if (cancelled) return;
        setFeed({ football, basketball, tennis, baseball, volleyball });
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        // home hero/widgets degrade to their empty states, not an error state
        setFeed(EMPTY_HOME_FEED);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const liveCounts = useMemo<Record<SportKey, number>>(
    () => ({
      football: feed.football.filter((g) => g.status === "live").length,
      basketball: feed.basketball.filter((g) => g.status === "live").length,
      tennis: feed.tennis.filter((m) => m.status === "live").length,
      baseball: feed.baseball.filter((g) => g.status === "live").length,
      volleyball: feed.volleyball.filter((g) => g.status === "live").length,
    }),
    [feed],
  );

  const { featured, liveItems } = useMemo(() => {
    const all = flattenHomeFeed(feed);
    const featured = pickFeatured(all);
    const liveItems = all.filter(
      (i) => i.status === "live" && !(featured && i.sport === featured.sport && i.id === featured.id),
    );
    return { featured, liveItems };
  }, [feed]);

  return (
    <PageShell maxWidth="max-w-6xl">
      <FeaturedMatchHero featured={featured} loaded={loaded} />
      <NewsTicker />
      <LiveTrackerWidget items={liveItems} />

      <div className="flex flex-wrap justify-center gap-6 px-2 pb-10">
        {(Object.keys(sportsTheme) as SportKey[]).map((key) => {
          const theme = sportsTheme[key];
          const mark = SPORT_MARK[key];
          const card = (
            <div className="glass-panel h-full w-full max-w-[340px] rounded-[26px] p-7 text-start transition duration-300 hover:-translate-y-1.5">
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

      <GlobalCoverageGlobe />
    </PageShell>
  );
}
