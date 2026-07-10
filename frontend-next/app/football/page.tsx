"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import ThemeLayout from "@/components/theme-layout";
import { useLiveGame } from "@/hooks/useLiveGame";
import { TKey, useLang } from "@/lib/i18n";
import { Game, fetchTodaysGames } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function kickoffTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function GameCard({ game, t }: { game: Game; t: (key: TKey) => string }) {
  const [live, setLive] = useState(game);
  useEffect(() => setLive(game), [game]);

  useLiveGame(
    game.status === "live" ? `/ws/games/football/${game.id}/` : null,
    (payload) =>
      setLive((prev) => ({
        ...prev,
        home_score: payload.home_score,
        away_score: payload.away_score,
        minute: payload.minute,
        status: payload.status ?? prev.status,
      })),
  );

  return (
    <Link href={`/football/games/${live.id}`}>
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
            {live.status === "scheduled" ? kickoffTime(live.kickoff) : `${live.home_score ?? "-"} : ${live.away_score ?? "-"}`}
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

export default function FootballGames() {
  const { t, lang } = useLang();
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodaysGames(lang).then(setGames).catch((e) => setError(String(e)));
  }, [lang]);

  return (
    <ThemeLayout sport="football">
      <h2 className="mb-4 text-xl font-bold text-white">{t("todaysGames")}</h2>
      {error && <p className="rounded-md bg-red-950/50 p-3 text-sm text-red-200">{t("loadErrorGames")}: {error}</p>}
      {!games && !error && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
      {games?.length === 0 && <p className="text-white/70">{t("noGames")}</p>}
      <div className="space-y-3">
        {games?.map((game) => (
          <GameCard key={game.id} game={game} t={t} />
        ))}
      </div>
    </ThemeLayout>
  );
}
