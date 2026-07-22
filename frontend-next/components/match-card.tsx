"use client";

import Link from "next/link";

import { useFadeUpReveal } from "@/hooks/useFadeUpReveal";
import { TKey } from "@/lib/i18n";
import { TennisMatch } from "@/lib/api";

function startTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Tennis's list-row card — shared by the top-level matches list and now the
// competition hub's Live/Upcoming tabs. Unlike football/basketball's
// GameCard, no live-score WebSocket at list level (matches existing
// behavior — live ticking is only wired on the tennis detail page). Same
// glass row layout/status treatment as GameCard for a consistent design
// language across sports (per the redesign brief).
export default function MatchCard({ match, t }: { match: TennisMatch; t: (key: TKey) => string }) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const statusLabel = isLive ? t("liveNow") : isFinished ? t("statusFinished") : startTime(match.start_time);
  const statusColorVar = isLive ? "var(--status-live)" : isFinished ? "var(--status-finished)" : "var(--status-upcoming)";
  const revealRef = useFadeUpReveal<HTMLDivElement>();

  return (
    <div ref={revealRef} className="fade-up">
      <Link href={`/tennis/matches/${match.id}`}>
        <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-[20px] p-5 transition duration-200 hover:-translate-y-1 hover:border-[var(--brand-accent)]/40">
          <div className="flex min-w-[260px] flex-1 items-center gap-4">
            <span className="flex-1 text-end text-[15px] font-bold text-white">{match.player1.name}</span>
            <span dir="ltr" className="min-w-[64px] rounded-lg bg-white/10 px-3 py-1.5 text-center text-sm font-extrabold text-white">
              vs
            </span>
            <span className="flex-1 text-start text-[15px] font-bold text-white">{match.player2.name}</span>
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
