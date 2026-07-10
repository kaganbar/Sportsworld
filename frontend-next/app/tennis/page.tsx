"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import ThemeLayout from "@/components/theme-layout";
import { useLang } from "@/lib/i18n";
import { TennisMatch, fetchTennisMatches } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function startTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function TennisMatches() {
  const { t, lang } = useLang();
  const [matches, setMatches] = useState<TennisMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTennisMatches(lang).then(setMatches).catch((e) => setError(String(e)));
  }, [lang]);

  return (
    <ThemeLayout sport="tennis">
      <h2 className="mb-4 text-xl font-bold text-white">{t("todaysGames")}</h2>
      {error && <p className="rounded-md bg-red-950/50 p-3 text-sm text-red-200">{t("loadErrorGames")}: {error}</p>}
      {!matches && !error && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
      {matches?.length === 0 && <p className="text-white/70">{t("noGames")}</p>}
      <div className="space-y-3">
        {matches?.map((match) => (
          <Link key={match.id} href={`/tennis/matches/${match.id}`}>
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
        ))}
      </div>
    </ThemeLayout>
  );
}
