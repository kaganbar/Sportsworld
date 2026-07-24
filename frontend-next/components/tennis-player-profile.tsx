"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { TennisPlayerProfile as Profile, fetchTennisPlayer } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { EmptyState } from "./empty-state";
import { ProfileSkeleton } from "./skeleton";

export function TennisPlayerProfile({ id }: { id: string }) {
  const { lang, t } = useLang();
  const [p, setP] = useState<Profile | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchTennisPlayer(id, lang)
      .then((d) => alive && setP(d))
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, [id, lang]);

  if (err) return <EmptyState icon={<WifiOff size={24} />} message={t("loadErrorGame")} />;
  if (!p) return <ProfileSkeleton />;

  const tiles: { label: string; value: string | number }[] = [
    { label: t("playerWorldRank"), value: p.ranking ?? "—" },
    { label: t("playerWinPct"), value: p.win_pct ?? "—" },
    { label: t("playerAcesPerMatch"), value: p.aces_per_match ?? "—" },
  ];

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-display text-4xl tracking-wide text-[color:var(--chalk)] sm:text-5xl">{p.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--chalk-dim)]">
          <span>{p.country}</span>
          <span>·</span>
          <span>{t(p.tour === "atp" ? "tourAtp" : "tourWta")}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="font-display text-3xl text-[color:var(--chalk)]" dir="ltr">{tile.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-[color:var(--chalk-dim)]">{tile.label}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
