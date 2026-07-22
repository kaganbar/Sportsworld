"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useLiveGame } from "@/hooks/useLiveGame";
import { useFadeUpReveal } from "@/hooks/useFadeUpReveal";
import { TKey } from "@/lib/i18n";
import { Game } from "@/lib/api";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Shared by every team sport's (football/basketball/baseball/volleyball)
// game lists (detail pages, and now the competition hub's Live/Upcoming
// tabs) — all four share the same `Game` shape, differing only in the
// WebSocket route prefix and detail route segment.
//
// Row layout (home — score/time pill — away — status pill) and glass
// treatment match the design brief's Matches list spec; status color/label
// mirrors the brief's statusInfo() helper.
export default function GameCard({
  game,
  sport,
  t,
}: {
  game: Game;
  sport: "football" | "basketball" | "baseball" | "volleyball";
  t: (key: TKey) => string;
}) {
  const [live, setLive] = useState(game);
  useEffect(() => setLive(game), [game]);
  const revealRef = useFadeUpReveal<HTMLDivElement>();

  useLiveGame(
    game.status === "live" ? `/ws/games/${sport}/${game.id}/` : null,
    (payload) =>
      setLive((prev) => ({
        ...prev,
        home_score: payload.home_score,
        away_score: payload.away_score,
        minute: payload.minute ?? prev.minute,
        status: payload.status ?? prev.status,
      })),
  );

  const isLive = live.status === "live";
  const isFinished = live.status === "finished";
  const statusLabel = isLive
    ? `${t("liveNow")}${live.minute != null ? ` · ${live.minute}'` : ""}`
    : isFinished
      ? t("statusFinished")
      : timeOf(live.kickoff);
  const statusColorVar = isLive ? "var(--status-live)" : isFinished ? "var(--status-finished)" : "var(--status-upcoming)";

  return (
    <div ref={revealRef} className="fade-up">
      <Link href={`/${sport}/games/${live.id}`}>
        <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-[20px] p-5 transition duration-200 hover:-translate-y-1 hover:border-[var(--brand-accent)]/40">
          <div className="flex min-w-[260px] flex-1 items-center gap-4">
            <span className="flex-1 text-end text-[15px] font-bold text-white">{live.home_team.name}</span>
            <span
              dir="ltr"
              className="min-w-[64px] rounded-lg bg-white/10 px-3 py-1.5 text-center text-lg font-extrabold text-white"
            >
              {live.status === "scheduled" ? timeOf(live.kickoff) : `${live.home_score ?? "-"} - ${live.away_score ?? "-"}`}
            </span>
            <span className="flex-1 text-start text-[15px] font-bold text-white">{live.away_team.name}</span>
          </div>
          <div className="flex min-w-[120px] items-center justify-end gap-2 text-sm font-semibold" style={{ color: statusColorVar }}>
            {isLive && <span className="live-dot h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--status-live)]" />}
            {statusLabel}
          </div>
        </div>
      </Link>
    </div>
  );
}
