"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Users, WifiOff } from "lucide-react";
import { TeamRoster as Roster, fetchTeamRoster } from "@/lib/api";
import { useLang, translateFootballPosition } from "@/lib/i18n";
import { EmptyState } from "./empty-state";
import { RowsSkeleton, Skeleton } from "./skeleton";

/**
 * A team's page: header (name, coach) + its squad, each player linking to their
 * profile. Reached from standings rows and game-detail team names.
 */
export function TeamRoster({ id }: { id: string }) {
  const { lang, t } = useLang();
  const [data, setData] = useState<Roster | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchTeamRoster(id, lang)
      .then((d) => alive && setData(d))
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, [id, lang]);

  if (err) return <EmptyState icon={<WifiOff size={24} />} message={t("loadErrorGame")} />;
  if (!data)
    return (
      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14" aria-busy>
        <Skeleton className="mb-8 h-11 w-64" />
        <RowsSkeleton count={6} />
      </main>
    );

  const { team, players } = data;

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-wide text-[color:var(--chalk)] sm:text-5xl">{team.name}</h1>
        {team.coach_name && (
          <p className="mt-1 text-sm text-[color:var(--chalk-dim)]">
            {t("coach")}: {team.coach_name}
          </p>
        )}
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--chalk-dim)]">
        {t("squad")}
      </h2>
      {players.length === 0 ? (
        <EmptyState icon={<Users size={24} />} message={t("noRosterData")} />
      ) : (
        <div className="flex flex-col">
          {players.map((p) => {
            const pos = team.sport === "football" ? translateFootballPosition(t, p.position) : p.position;
            return (
              <Link
                key={p.id}
                href={`/${team.sport}/players/${p.id}`}
                className="flex items-center gap-3 border-t border-white/10 px-2 py-3 transition-colors first:border-t-0 hover:bg-white/[0.04]"
              >
                <span className="w-8 shrink-0 text-center font-display text-[color:var(--chalk-dim)]" dir="ltr">
                  {p.shirt_number ?? "—"}
                </span>
                <span className="flex-1 font-medium text-[color:var(--chalk)]">{p.name}</span>
                <span className="text-sm text-[color:var(--chalk-dim)]">{pos}</span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
