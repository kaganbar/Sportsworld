"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TableProperties } from "lucide-react";
import { Competition, StandingsRow, fetchCompetitions, fetchStandings } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { SportKey } from "@/theme/sportsTheme";
import { EmptyState } from "./empty-state";
import { RowsSkeleton } from "./skeleton";

type StandingsSport = "football" | "basketball" | "baseball" | "volleyball";

/**
 * League table for a team sport. Picks the competition with the most fixtures
 * by default, with a dropdown to switch. Each row links to that team's roster
 * page. Football shows draws; the other sports still carry the same columns
 * (draws just tend to be 0), so one table serves all four.
 */
export function StandingsSection({ sport }: { sport: Exclude<SportKey, "tennis"> }) {
  const { lang, t } = useLang();
  const [comps, setComps] = useState<Competition[] | null>(null);
  const [slug, setSlug] = useState<string>("");
  const [rows, setRows] = useState<StandingsRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchCompetitions(sport, lang)
      .then((cs) => {
        if (!alive) return;
        setComps(cs);
        const best = [...cs].sort((a, b) => b.match_count - a.match_count)[0];
        setSlug((cur) => cur || best?.slug || "");
      })
      .catch(() => alive && setComps([]));
    return () => {
      alive = false;
    };
  }, [sport, lang]);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setRows(null);
    fetchStandings(sport as StandingsSport, slug, lang)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [sport, slug, lang]);

  if (!comps) return <RowsSkeleton count={8} />;

  return (
    <div className="flex flex-col gap-5">
      {comps.length > 0 && (
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full max-w-xs rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[color:var(--chalk)] focus:border-[color:var(--brand-accent)] focus:outline-none"
        >
          {comps.map((c) => (
            <option key={c.slug} value={c.slug} className="bg-[color:var(--pitch-deep)]">
              {c.name}
            </option>
          ))}
        </select>
      )}

      {!rows ? (
        <RowsSkeleton count={8} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<TableProperties size={24} />} message={t("noStandingsData")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[color:var(--chalk-dim)]">
                <th className="px-2 py-2 text-start font-medium">#</th>
                <th className="px-2 py-2 text-start font-medium">{t("tableTeam")}</th>
                <th className="px-2 py-2 text-center font-medium">P</th>
                <th className="px-2 py-2 text-center font-medium">{t("winsAbbr")}</th>
                <th className="px-2 py-2 text-center font-medium">{t("drawsAbbr")}</th>
                <th className="px-2 py-2 text-center font-medium">{t("lossesAbbr")}</th>
                <th className="px-2 py-2 text-center font-medium">{t("tableGD")}</th>
                <th className="px-2 py-2 text-center font-medium">{t("tablePts")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.team_id} className="border-t border-white/10">
                  <td className="px-2 py-2.5 text-[color:var(--chalk-dim)]">{i + 1}</td>
                  <td className="px-2 py-2.5">
                    <Link
                      href={`/${sport}/teams/${r.team_id}`}
                      className="flex items-center gap-2 font-medium text-[color:var(--chalk)] hover:text-[color:var(--brand-accent)]"
                    >
                      {r.team_name}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 text-center text-[color:var(--chalk-dim)]" dir="ltr">{r.played}</td>
                  <td className="px-2 py-2.5 text-center text-[color:var(--chalk-dim)]" dir="ltr">{r.wins}</td>
                  <td className="px-2 py-2.5 text-center text-[color:var(--chalk-dim)]" dir="ltr">{r.draws}</td>
                  <td className="px-2 py-2.5 text-center text-[color:var(--chalk-dim)]" dir="ltr">{r.losses}</td>
                  <td className="px-2 py-2.5 text-center text-[color:var(--chalk-dim)]" dir="ltr">{r.goal_diff}</td>
                  <td className="px-2 py-2.5 text-center font-bold text-[color:var(--chalk)]" dir="ltr">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
