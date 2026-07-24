"use client";

import Link from "next/link";
import { useState } from "react";
import { Game } from "@/lib/api";
import { useFadeUpReveal } from "@/hooks/useFadeUpReveal";
import { useLiveGame } from "@/hooks/useLiveGame";
import { useLang } from "@/lib/i18n";
import { SportKey, sportsTheme } from "@/theme/sportsTheme";
import { TeamBadge } from "./team-badge";

type TeamSportKey = Exclude<SportKey, "tennis">;

/** The mutable fields a live tick overlays onto a Game (see SimulatedTickerService). */
interface GameTick {
  home_score?: number;
  away_score?: number;
  minute?: number;
  status?: Game["status"];
}

/** HH:MM in the viewer's locale, from an ISO kickoff string. */
function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * A single fixture card for a team sport (football/basketball/baseball/
 * volleyball). Shows both crests, names, and either a kickoff time (scheduled),
 * a live minute + score, or a full-time score. Links to the match detail route.
 *
 * The numeric score pair is wrapped in dir="ltr" so the home:away order never
 * visually swaps under RTL — the bidi bug documented in CLAUDE.md.
 */
export function GameCard({ sport, game: base }: { sport: TeamSportKey; game: Game }) {
  const { t } = useLang();
  const accent = sportsTheme[sport].accent;

  // Overlay real-time ticks on top of the polled prop. The prop still refreshes
  // (the section polls, and catches scheduled→live transitions the socket
  // can't); the socket delivers second-by-second score/minute while live.
  const [tick, setTick] = useState<GameTick | null>(null);
  const game: Game = tick ? { ...base, ...tick } : base;

  const live = game.status === "live";
  const finished = game.status === "finished";
  const hasScore = game.home_score !== null && game.away_score !== null;

  useLiveGame(live ? `/ws/games/${sport}/${game.id}/` : null, (p) => {
    const next: GameTick = { home_score: p.home_score, away_score: p.away_score, status: p.status };
    // Only football ticks carry a minute; don't clobber the prop's null with
    // undefined for the other sports (would render "undefined'").
    if (typeof p.minute === "number") next.minute = p.minute;
    setTick(next);
  });

  const reveal = useFadeUpReveal<HTMLAnchorElement>();

  return (
    <Link
      ref={reveal}
      href={`/${sport}/games/${game.id}`}
      className="fade-up group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
    >
      {/* Top row: competition + status */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-[color:var(--chalk-dim)]">{game.competition}</span>
        {live ? (
          <span className="flex items-center gap-1.5 font-semibold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            {game.minute !== null ? `${game.minute}'` : t("liveNow")}
          </span>
        ) : finished ? (
          <span className="font-medium text-[color:var(--chalk-dim)]">{t("statusFinished")}</span>
        ) : (
          <span className="font-medium text-[color:var(--chalk)]" dir="ltr">
            {clockTime(game.kickoff)}
          </span>
        )}
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <TeamRow team={game.home_team} />
          <TeamRow team={game.away_team} />
        </div>

        {(live || finished) && hasScore && (
          <div
            dir="ltr"
            className="flex flex-col items-center gap-2 px-2 font-display text-2xl leading-none"
            style={{ color: live ? accent : "var(--chalk)" }}
          >
            <span>{game.home_score}</span>
            <span>{game.away_score}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function TeamRow({ team }: { team: Game["home_team"] }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamBadge team={team} size={28} />
      <span className="truncate text-sm font-medium text-[color:var(--chalk)]">{team.name}</span>
    </div>
  );
}
