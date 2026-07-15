"use client";

import { useEffect, useState } from "react";

import ThemeLayout from "@/components/theme-layout";
import PlayerProfileCard from "@/components/player-profile-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/i18n";
import { BaseballSeasonStats, PlayerProfile, fetchPlayer } from "@/lib/api";

export default function BaseballPlayerProfile({ params }: { params: { id: string } }) {
  const { id } = params;
  const { t, lang } = useLang();
  const [data, setData] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayer(id, lang).then(setData).catch((e) => setError(String(e)));
  }, [id, lang]);

  const stats = data?.season_stats as BaseballSeasonStats | null | undefined;

  return (
    <ThemeLayout
      sport="baseball"
      breadcrumbExtra={data ? [{ label: data.name, href: `/baseball/players/${id}` }] : []}
    >
      {error && <p role="alert" className="rounded-md bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
      {!data && !error && <Skeleton className="mx-auto h-80 w-full max-w-[520px] rounded-[28px]" />}
      {data && (
        <PlayerProfileCard
          name={data.name}
          team={data.team.name}
          position={data.position}
          stats={[
            { label: t("playerAvg"), value: stats?.avg != null ? stats.avg.toFixed(3) : "-" },
            { label: t("playerHomeRuns"), value: stats?.homeRuns ?? "-" },
            { label: t("playerRbi"), value: stats?.rbi ?? "-" },
          ]}
        />
      )}
    </ThemeLayout>
  );
}
