"use client";

import Link from "next/link";

import { TKey } from "@/lib/i18n";
import { TennisMatch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function startTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Tennis's list-row card — shared by the top-level matches list and now the
// competition hub's Live/Upcoming tabs. Unlike football/basketball's
// GameCard, no live-score WebSocket at list level (matches existing
// behavior — live ticking is only wired on the tennis detail page).
export default function MatchCard({ match, t }: { match: TennisMatch; t: (key: TKey) => string }) {
  return (
    <Link href={`/tennis/matches/${match.id}`}>
      <Card className="flex items-center justify-between gap-4 p-4 transition hover:bg-accent">
        <div className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          <span>
            {match.tournament} · {match.round}
            {match.status === "live" && <Badge variant="live" className="ms-2">{t("liveNow")}</Badge>}
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-3">
          <span className="text-sm font-medium">{match.player1.name}</span>
          <span className="rounded-md bg-muted px-2 py-1 text-sm font-bold" dir="ltr">
            {match.status === "scheduled" ? startTime(match.start_time) : t("liveNow")}
          </span>
          <span className="text-sm font-medium">{match.player2.name}</span>
        </div>
        <div className="flex-1 text-end text-xs text-muted-foreground">{match.venue}</div>
      </Card>
    </Link>
  );
}
