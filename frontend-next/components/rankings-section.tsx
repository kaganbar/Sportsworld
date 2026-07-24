"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ListOrdered } from "lucide-react";
import { RankingEntry, fetchRankings } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { EmptyState } from "./empty-state";
import { RowsSkeleton } from "./skeleton";

/**
 * Tennis world rankings, ATP or WTA (toggle). Each player links to their
 * profile page. Tennis's counterpart to the team sports' StandingsSection.
 */
export function RankingsSection() {
  const { lang, t } = useLang();
  const [tour, setTour] = useState<"atp" | "wta">("atp");
  const [rows, setRows] = useState<RankingEntry[] | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    fetchRankings(tour, lang)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [tour, lang]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        {(["atp", "wta"] as const).map((tr) => (
          <button
            key={tr}
            type="button"
            onClick={() => setTour(tr)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tour === tr
                ? "bg-[color:var(--brand-accent)] text-[#06140c]"
                : "bg-white/5 text-[color:var(--chalk-dim)] hover:text-[color:var(--chalk)]"
            }`}
          >
            {t(tr === "atp" ? "tourAtp" : "tourWta")}
          </button>
        ))}
      </div>

      {!rows ? (
        <RowsSkeleton count={8} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<ListOrdered size={24} />} message={t("noRankingsData")} />
      ) : (
        <div className="flex flex-col">
          {rows.map((p) => (
            <Link
              key={p.id}
              href={`/tennis/players/${p.id}`}
              className="flex items-center gap-4 border-t border-white/10 px-2 py-3 transition-colors first:border-t-0 hover:bg-white/[0.04]"
            >
              <span className="w-8 shrink-0 text-center font-display text-lg text-[color:var(--brand-accent)]" dir="ltr">
                {p.ranking ?? "—"}
              </span>
              <span className="flex-1 font-medium text-[color:var(--chalk)]">{p.name}</span>
              <span className="text-sm text-[color:var(--chalk-dim)]">{p.country}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
