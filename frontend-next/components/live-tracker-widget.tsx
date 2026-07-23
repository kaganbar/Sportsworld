"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useLiveGame } from "@/hooks/useLiveGame";
import TeamBadge from "@/components/team-badge";
import { useLang } from "@/lib/i18n";
import { sportsTheme } from "@/theme/sportsTheme";
import { FeedItem } from "@/lib/homeFeed";

// One live-updating pill, same merge pattern as components/game-card.tsx's
// useLiveGame usage. Tennis ticks carry set scores, not home/away totals
// (see app/tennis/matches/[id]/client.tsx), so `homeScore`/`awayScore` stay
// null for tennis and the pill falls back to "vs" — matching
// components/match-card.tsx's existing no-score-at-list-level behavior.
function LivePill({ item }: { item: FeedItem }) {
  const [live, setLive] = useState(item);
  useEffect(() => setLive(item), [item]);

  useLiveGame(
    live.status === "live" ? live.wsPath : null,
    (payload) =>
      setLive((prev) => ({
        ...prev,
        homeScore: payload.home_score ?? prev.homeScore,
        awayScore: payload.away_score ?? prev.awayScore,
        minute: payload.minute ?? prev.minute,
        status: payload.status ?? prev.status,
      })),
  );

  // Ticked to finished since the page loaded — drop out of the live strip
  // rather than showing a stale "LIVE" pill for a match that already ended.
  if (live.status !== "live") return null;

  const theme = sportsTheme[live.sport];
  const hasScore = live.homeScore !== null || live.awayScore !== null;

  return (
    <Link
      href={live.href}
      className="glass-panel flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:border-[var(--brand-accent)]/40"
    >
      <span className="live-dot h-[6px] w-[6px] shrink-0 rounded-full bg-[var(--status-live)]" />
      <span aria-hidden="true">{theme.emoji}</span>
      <TeamBadge name={live.homeName} logoUrl={live.homeLogo} color={live.homeColor} size={18} />
      <span dir="ltr" className="min-w-[34px] text-center">
        {hasScore ? `${live.homeScore ?? "-"}-${live.awayScore ?? "-"}` : "vs"}
      </span>
      <TeamBadge name={live.awayName} logoUrl={live.awayLogo} color={live.awayColor} size={18} />
    </Link>
  );
}

// Compact horizontal strip of every other currently-live game (the one
// featured in FeaturedMatchHero is excluded upstream by app/page.tsx before
// this ever renders — see lib/homeFeed.ts). Renders nothing at all when
// there's nothing live to show, rather than an empty "Live Now" header.
export default function LiveTrackerWidget({ items }: { items: FeedItem[] }) {
  const { t } = useLang();

  if (items.length === 0) return null;

  return (
    <div className="px-2 pb-8">
      <div className="glass-panel mx-auto flex max-w-6xl items-center gap-3 overflow-x-auto rounded-[20px] p-3">
        <span className="flex shrink-0 items-center gap-1.5 ps-1 text-xs font-extrabold tracking-widest text-[var(--status-live)]">
          <span className="live-dot h-[7px] w-[7px] rounded-full bg-[var(--status-live)]" />
          {t("liveNow").toUpperCase()}
        </span>
        {items.map((item) => (
          <LivePill key={`${item.sport}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  );
}
