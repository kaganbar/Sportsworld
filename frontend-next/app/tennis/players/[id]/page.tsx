"use client";

import { useEffect, useState } from "react";

import ThemeLayout from "@/components/theme-layout";
import PlayerProfileCard from "@/components/player-profile-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/i18n";
import { TennisPlayerProfile, fetchTennisPlayer } from "@/lib/api";

export default function TennisPlayerProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { t, lang } = useLang();
  const [data, setData] = useState<TennisPlayerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTennisPlayer(id, lang).then(setData).catch((e) => setError(String(e)));
  }, [id, lang]);

  return (
    <ThemeLayout
      sport="tennis"
      breadcrumbExtra={data ? [{ label: data.name, href: `/tennis/players/${id}` }] : []}
    >
      {error && <p className="rounded-md bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
      {!data && !error && <Skeleton className="mx-auto h-80 w-full max-w-[520px] rounded-[28px]" />}
      {data && (
        <PlayerProfileCard
          name={data.name}
          team={t(data.tour === "atp" ? "tourAtp" : "tourWta")}
          position={t("positionSingles")}
          stats={[
            { label: t("playerWorldRank"), value: data.ranking ?? "-" },
            { label: t("playerWinPct"), value: data.win_pct != null ? `${data.win_pct}%` : "-" },
            { label: t("playerAcesPerMatch"), value: data.aces_per_match ?? "-" },
          ]}
        />
      )}
    </ThemeLayout>
  );
}
