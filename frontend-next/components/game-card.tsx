"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useLiveGame } from "@/hooks/useLiveGame";
import { useFadeUpReveal } from "@/hooks/useFadeUpReveal";
import TeamBadge from "@/components/team-badge";
import SimulatedBadge from "@/components/simulated-badge";
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

  // Score display has no visual feedback of its own when a goal lands — it
  // just snaps to the new number. Remounting the pill on a key derived from
  // both scores (rather than a separate "did it change" boolean + timer)
  // gets the enter animation for free from framer-motion's initial/animate
  // diffing: whenever either score changes, React sees a new key, treats it
  // as a fresh element, and plays `initial` -> `animate` once more.
  const scoreKey = `${live.home_score}-${live.away_score}`;

  return (
    <div ref={revealRef} className="fade-up">
      <Link href={`/${sport}/games/${live.id}`}>
        <motion.div
          className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-[20px] p-5 transition-colors duration-200 hover:border-[var(--brand-accent)]/40"
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="flex min-w-[260px] flex-1 items-center gap-4">
            <span className="flex flex-1 items-center justify-end gap-2">
              <span className="text-end text-[15px] font-bold text-white">{live.home_team.name}</span>
              <TeamBadge name={live.home_team.name} logoUrl={live.home_team.logo_url} color={live.home_team.primary_color} size={22} />
            </span>
            <motion.span
              key={scoreKey}
              dir="ltr"
              initial={{ scale: 1.32, backgroundColor: "rgba(56,189,248,0.5)" }}
              animate={{ scale: 1, backgroundColor: "rgba(255,255,255,0.1)" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="min-w-[64px] rounded-lg px-3 py-1.5 text-center text-lg font-extrabold text-white"
            >
              {live.status === "scheduled" ? timeOf(live.kickoff) : `${live.home_score ?? "-"} - ${live.away_score ?? "-"}`}
            </motion.span>
            <span className="flex flex-1 items-center justify-start gap-2">
              <TeamBadge name={live.away_team.name} logoUrl={live.away_team.logo_url} color={live.away_team.primary_color} size={22} />
              <span className="text-start text-[15px] font-bold text-white">{live.away_team.name}</span>
            </span>
          </div>
          <div className="flex min-w-[120px] items-center justify-end gap-2 text-sm font-semibold" style={{ color: statusColorVar }}>
            {live.is_real === false && <SimulatedBadge />}
            {isLive && <span className="live-dot h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--status-live)]" />}
            {statusLabel}
          </div>
        </motion.div>
      </Link>
    </div>
  );
}
