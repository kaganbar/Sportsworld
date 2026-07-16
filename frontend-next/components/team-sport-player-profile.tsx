"use client";

import { useEffect, useState } from "react";

import ThemeLayout from "@/components/theme-layout";
import PlayerProfileCard from "@/components/player-profile-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TKey, useLang } from "@/lib/i18n";
import { PlayerProfile, fetchPlayer } from "@/lib/api";

export interface PlayerStatRow<S> {
  labelKey: TKey;
  value: (stats: S | null | undefined) => string | number;
}

// The 4 team-sport player-profile pages (football/basketball/baseball/
// volleyball) were copy-pasted file-for-file, differing only in the sport
// key and the 3 season-stat rows shown — same class of duplication as the
// backend sport agents' buildMatchContext/enrichContext. Each page.tsx is
// now a thin wrapper supplying its sport and stat-row config.
export default function TeamSportPlayerProfile<S>({
  id,
  sport,
  statRows,
}: {
  id: string;
  sport: PlayerProfile["sport"];
  statRows: PlayerStatRow<S>[];
}) {
  const { t, lang } = useLang();
  const [data, setData] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayer(id, lang).then(setData).catch((e) => setError(String(e)));
  }, [id, lang]);

  const stats = data?.season_stats as S | null | undefined;

  return (
    <ThemeLayout sport={sport} breadcrumbExtra={data ? [{ label: data.name, href: `/${sport}/players/${id}` }] : []}>
      {error && <p role="alert" className="rounded-md bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
      {!data && !error && <Skeleton className="mx-auto h-80 w-full max-w-[520px] rounded-[28px]" />}
      {data && (
        <PlayerProfileCard
          name={data.name}
          team={data.team.name}
          position={data.position}
          stats={statRows.map((row) => ({ label: t(row.labelKey), value: row.value(stats) }))}
        />
      )}
    </ThemeLayout>
  );
}
