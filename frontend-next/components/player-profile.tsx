"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, WifiOff } from "lucide-react";
import { PlayerProfile as Profile, fetchPlayer } from "@/lib/api";
import { useLang, translateFootballPosition, type TKey } from "@/lib/i18n";
import { EmptyState } from "./empty-state";
import { ProfileSkeleton } from "./skeleton";

/** Map a sport's season_stats object to labeled stat tiles. */
function statTiles(p: Profile): { key: TKey; value: string | number }[] {
  const s = p.season_stats;
  if (!s) return [];
  if ("goals" in s) return [
    { key: "playerGoals", value: s.goals },
    { key: "playerAssists", value: s.assists },
    { key: "playerRating", value: s.rating },
  ];
  if ("ppg" in s) return [
    { key: "playerPpg", value: s.ppg },
    { key: "playerRpg", value: s.rpg },
    { key: "playerApg", value: s.apg },
  ];
  if ("avg" in s) return [
    { key: "playerAvg", value: s.avg },
    { key: "playerHomeRuns", value: s.homeRuns },
    { key: "playerRbi", value: s.rbi },
  ];
  return [
    { key: "playerKills", value: s.kills },
    { key: "playerDigs", value: s.digs },
    { key: "playerBlocks", value: s.blocks },
  ];
}

export function PlayerProfile({ id }: { id: string }) {
  const { lang, t } = useLang();
  const [p, setP] = useState<Profile | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchPlayer(id, lang)
      .then((d) => alive && setP(d))
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, [id, lang]);

  if (err) return <EmptyState icon={<WifiOff size={24} />} message={t("loadErrorGame")} />;
  if (!p) return <ProfileSkeleton />;

  const tiles = statTiles(p);
  const position = p.sport === "football" ? translateFootballPosition(t, p.position) : p.position;

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-display text-4xl tracking-wide text-[color:var(--chalk)] sm:text-5xl">{p.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--chalk-dim)]">
          <span>{position}</span>
          <span>·</span>
          <Link href={`/${p.sport}/teams/${p.team.id}`} className="text-[color:var(--brand-accent)] hover:underline">
            {p.team.name}
          </Link>
          {p.is_real && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{t("verifiedPlayer")}</span>
          )}
        </div>
      </div>

      {tiles.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {tiles.map((tile) => (
            <div key={tile.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <p className="font-display text-3xl text-[color:var(--chalk)]" dir="ltr">{tile.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-[color:var(--chalk-dim)]">{t(tile.key)}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<BarChart3 size={24} />} message={t("noRosterData")} />
      )}
    </main>
  );
}
