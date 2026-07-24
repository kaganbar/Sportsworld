"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchBaseballGames,
  fetchBasketballGames,
  fetchTennisMatches,
  fetchTodaysGames,
  fetchVolleyballGames,
} from "@/lib/api";
import {
  EMPTY_HOME_FEED,
  FeedItem,
  HomeFeed,
  flattenHomeFeed,
} from "@/lib/homeFeed";
import { useLang } from "@/lib/i18n";
import { sportsTheme } from "@/theme/sportsTheme";

/**
 * Cross-sport "what's on right now" strip on the homepage. Fetches all five
 * sports in parallel (one pass, reusing lib/homeFeed's flatten helper), then
 * shows everything live across every sport — or, if nothing is live, the next
 * upcoming fixtures by start time. Polls every 20s.
 */
export function HomeLive() {
  const { lang, t } = useLang();
  const [feed, setFeed] = useState<HomeFeed | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [football, basketball, tennis, baseball, volleyball] = await Promise.all([
        fetchTodaysGames(lang).catch(() => []),
        fetchBasketballGames(lang).catch(() => []),
        fetchTennisMatches(lang).catch(() => []),
        fetchBaseballGames(lang).catch(() => []),
        fetchVolleyballGames(lang).catch(() => []),
      ]);
      if (alive) setFeed({ football, basketball, tennis, baseball, volleyball });
    };
    load();
    const iv = setInterval(load, 20_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [lang]);

  const { items, isLive } = useMemo(() => {
    const all = flattenHomeFeed(feed ?? EMPTY_HOME_FEED);
    const byTime = (a: FeedItem, b: FeedItem) =>
      new Date(a.time).getTime() - new Date(b.time).getTime();
    const live = all.filter((i) => i.status === "live").sort(byTime);
    if (live.length) return { items: live.slice(0, 6), isLive: true };
    const upcoming = all.filter((i) => i.status === "scheduled").sort(byTime);
    return { items: upcoming.slice(0, 6), isLive: false };
  }, [feed]);

  if (!feed || items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
      <div className="mb-6 flex items-center gap-2.5">
        {isLive && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}
        <h2 className="font-display text-2xl tracking-wide text-[color:var(--chalk)]">
          {isLive ? t("liveNow") : t("tab_upcoming")}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <FeedCard key={`${item.sport}-${item.id}`} item={item} live={isLive} />
        ))}
      </div>
    </section>
  );
}

function FeedCard({ item, live }: { item: FeedItem; live: boolean }) {
  const accent = sportsTheme[item.sport].accent;
  const hasScore = item.homeScore !== null && item.awayScore !== null;
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xl" style={{ background: `${accent}14` }}>
        {sportsTheme[item.sport].icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-[color:var(--chalk-dim)]">{item.competition}</p>
        <p className="truncate text-sm font-medium text-[color:var(--chalk)]">
          {item.homeName} <span className="text-[color:var(--chalk-dim)]">–</span> {item.awayName}
        </p>
      </div>
      {live && hasScore ? (
        <span dir="ltr" className="shrink-0 font-display text-lg" style={{ color: accent }}>
          {item.homeScore}-{item.awayScore}
        </span>
      ) : (
        <span dir="ltr" className="shrink-0 text-xs text-[color:var(--chalk-dim)]">
          {new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </Link>
  );
}
