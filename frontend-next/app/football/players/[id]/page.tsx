"use client";

import { useEffect, useState } from "react";

import ThemeLayout from "@/components/theme-layout";
import PlayerProfileCard from "@/components/player-profile-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/i18n";
import { FootballSeasonStats, PlayerProfile, fetchPlayer } from "@/lib/api";

export default function FootballPlayerProfile({ params }: { params: { id: string } }) {
  const { id } = params;
  const { t, lang } = useLang();
  const [data, setData] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayer(id, lang).then(setData).catch((e) => setError(String(e)));
  }, [id, lang]);

  const stats = data?.season_stats as FootballSeasonStats | null | undefined;

  return (
    <ThemeLayout
      sport="football"
      breadcrumbExtra={data ? [{ label: data.name, href: `/football/players/${id}` }] : []}
    >
      {error && <p role="alert" className="rounded-md bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
      {!data && !error && <Skeleton className="mx-auto h-80 w-full max-w-[520px] rounded-[28px]" />}
      {data && (
        <PlayerProfileCard
          name={data.name}
          team={data.team.name}
          position={data.position}
          stats={[
            { label: t("playerGoals"), value: stats?.goals ?? "-" },
            { label: t("playerAssists"), value: stats?.assists ?? "-" },
            { label: t("playerRating"), value: stats?.rating != null ? stats.rating.toFixed(1) : "-" },
          ]}
        />
      )}
    </ThemeLayout>
  );
}
