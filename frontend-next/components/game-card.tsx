"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useLiveGame } from "@/hooks/useLiveGame";
import { TKey } from "@/lib/i18n";
import { Game } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Shared by football and basketball's game lists (detail pages, and now
// the competition hub's Live/Upcoming tabs) — both sports share the same
// `Game` shape, differing only in the WebSocket route prefix and detail
// route segment.
export default function GameCard({
  game,
  sport,
  t,
}: {
  game: Game;
  sport: "football" | "basketball";
  t: (key: TKey) => string;
}) {
  const [live, setLive] = useState(game);
  useEffect(() => setLive(game), [game]);

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

  return (
    <Link href={`/${sport}/games/${live.id}`}>
      <Card className="flex items-center justify-between gap-4 p-4 transition hover:bg-accent">
        <div className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          <span>
            {live.competition}
            {live.status === "live" && <Badge variant="live" className="ms-2">{t("liveNow")}</Badge>}
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-3">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: live.home_team.primary_color }} />
            {live.home_team.name}
          </span>
          <span className="rounded-md bg-muted px-2 py-1 text-sm font-bold" dir="ltr">
            {live.status === "scheduled" ? timeOf(live.kickoff) : `${live.home_score ?? "-"} : ${live.away_score ?? "-"}`}
          </span>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {live.away_team.name}
            <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: live.away_team.primary_color }} />
          </span>
        </div>
        <div className="flex-1 text-end text-xs text-muted-foreground">{live.venue}</div>
      </Card>
    </Link>
  );
}
