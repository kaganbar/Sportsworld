"use client";

import Link from "next/link";
import { useState } from "react";
import { TennisMatch } from "@/lib/api";
import { useFadeUpReveal } from "@/hooks/useFadeUpReveal";
import { useLiveGame } from "@/hooks/useLiveGame";
import { useLang } from "@/lib/i18n";

/** HH:MM in the viewer's locale, from an ISO start_time string. */
function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * A single tennis match card (player vs player). Tennis carries no list-level
 * score, so this shows tournament/round + status/time only, and marks the
 * winner once finished. Links to the tennis match detail route.
 */
export function MatchCard({ match: base }: { match: TennisMatch }) {
  const { t } = useLang();

  // Tennis ticks only carry set games + status (no winner_id); overlay status
  // so a live match visibly flips to finished. The winner arrives on the next
  // section poll.
  const [status, setStatus] = useState<TennisMatch["status"] | null>(null);
  const match: TennisMatch = status ? { ...base, status } : base;
  const live = match.status === "live";
  const finished = match.status === "finished";

  useLiveGame(live ? `/ws/tennis/${match.id}/` : null, (p) => setStatus(p.status));

  const reveal = useFadeUpReveal<HTMLAnchorElement>();

  const PlayerRow = ({ id, name }: { id: number; name: string }) => {
    const won = finished && match.winner_id === id;
    return (
      <div className="flex items-center gap-2">
        <span
          className={`truncate text-sm ${won ? "font-bold text-[color:var(--chalk)]" : "font-medium text-[color:var(--chalk-dim)]"}`}
        >
          {name}
        </span>
        {won && <span className="text-xs text-[color:var(--brand-accent)]">✓</span>}
      </div>
    );
  };

  return (
    <Link
      ref={reveal}
      href={`/tennis/matches/${match.id}`}
      className="fade-up group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-[color:var(--chalk-dim)]">
          {match.tournament} · {match.round}
        </span>
        {live ? (
          <span className="flex items-center gap-1.5 font-semibold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            {t("liveNow")}
          </span>
        ) : finished ? (
          <span className="font-medium text-[color:var(--chalk-dim)]">{t("statusFinished")}</span>
        ) : (
          <span className="font-medium text-[color:var(--chalk)]" dir="ltr">
            {clockTime(match.start_time)}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <PlayerRow id={match.player1.id} name={match.player1.name} />
        <PlayerRow id={match.player2.id} name={match.player2.name} />
      </div>
    </Link>
  );
}
