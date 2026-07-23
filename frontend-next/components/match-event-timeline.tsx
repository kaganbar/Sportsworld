"use client";

import { Ban, Circle, Repeat, Square, Target, Tv, type LucideIcon } from "lucide-react";

import { TKey, useLang } from "@/lib/i18n";
import { MatchEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

// One icon + accent color per event type. Picked from lucide-react's
// long-stable core set (all present since well before this app's pinned
// 0.469.0) rather than a sport-specific icon that may not exist in every
// version: Circle stands in for the ball (goal/penalty differ by accent +
// label, own-goal gets its own icon since it's the one type worth visually
// flagging as "bad for that team"), Square is rendered filled for cards
// (color alone tells yellow from red), Repeat for subs, Tv for VAR.
const EVENT_ICON: Record<MatchEvent["type"], LucideIcon> = {
  goal: Circle,
  penalty_goal: Target,
  own_goal: Ban,
  yellow_card: Square,
  red_card: Square,
  substitution: Repeat,
  var_review: Tv,
};

const EVENT_COLOR: Record<MatchEvent["type"], string> = {
  goal: "text-[var(--brand-accent)]",
  penalty_goal: "text-[var(--brand-accent)]",
  own_goal: "text-red-400",
  yellow_card: "text-yellow-400",
  red_card: "text-red-500",
  substitution: "text-white/60",
  var_review: "text-white/60",
};

const EVENT_LABEL_KEY: Record<MatchEvent["type"], TKey> = {
  goal: "event_goal",
  penalty_goal: "event_penalty_goal",
  own_goal: "event_own_goal",
  yellow_card: "event_yellow_card",
  red_card: "event_red_card",
  substitution: "event_substitution",
  var_review: "event_var_review",
};

function minuteLabel(e: MatchEvent) {
  return e.stoppage_minute != null ? `${e.minute}+${e.stoppage_minute}'` : `${e.minute}'`;
}

// Sort key as a single number (minute plus a sub-minute fraction for
// stoppage time) so e.g. "45+2'" sorts after "45'" but before "46'".
function sortKey(e: MatchEvent) {
  return e.minute + (e.stoppage_minute ?? 0) / 100;
}

// Vertical minute-ordered match event timeline (goals/cards/subs/VAR
// reviews) — football-only. Rendered from app/football/games/[id]/client.tsx
// only when `events.length > 0`; basketball/tennis/baseball/volleyball never
// populate this array, so this component is never reached for them.
export default function MatchEventTimeline({
  events,
  homeTeamId,
}: {
  events: MatchEvent[];
  homeTeamId?: number;
}) {
  const { t } = useLang();
  const sorted = [...events].sort((a, b) => sortKey(a) - sortKey(b));

  return (
    <ol className="space-y-2">
      {sorted.map((e, i) => {
        const Icon = EVENT_ICON[e.type];
        const isCard = e.type === "yellow_card" || e.type === "red_card";
        const isHome = homeTeamId != null && e.team_id === homeTeamId;
        return (
          <li
            key={i}
            className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-2.5"
          >
            <span dir="ltr" className="w-12 shrink-0 text-center text-sm font-bold text-white/50">
              {minuteLabel(e)}
            </span>
            <Icon className={cn("h-4 w-4 shrink-0", EVENT_COLOR[e.type])} fill={isCard ? "currentColor" : "none"} />
            <span className="min-w-0 flex-1 truncate text-sm">
              {e.player && <span className="font-semibold text-white">{e.player}</span>}
              {e.player && " · "}
              <span className="text-white/60">{t(EVENT_LABEL_KEY[e.type])}</span>
              {e.type === "substitution" && e.related_player && (
                <span className="text-white/60"> → {e.related_player}</span>
              )}
              {e.detail && <span className="text-white/40"> ({e.detail})</span>}
            </span>
            {homeTeamId != null && (
              <span
                aria-hidden="true"
                className={cn("h-2 w-2 shrink-0 rounded-full", isHome ? "bg-[var(--brand-accent)]" : "bg-white/30")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
