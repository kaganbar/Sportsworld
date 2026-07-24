"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, ArrowRight, WifiOff } from "lucide-react";
import { TransferRumour, fetchTransfers } from "@/lib/api";
import { useLang, type TKey } from "@/lib/i18n";
import { timeAgo } from "@/lib/timeAgo";
import { EmptyState } from "./empty-state";
import { RowsSkeleton } from "./skeleton";

const STATUS_KEY: Record<TransferRumour["status"], TKey> = {
  rumor: "transferStatus_rumor",
  official: "transferStatus_official",
  completed: "transferStatus_completed",
  denied: "transferStatus_denied",
};

const STATUS_COLOR: Record<TransferRumour["status"], string> = {
  rumor: "#C6A24A",
  official: "#37E88B",
  completed: "#4AD8FF",
  denied: "#FF5D5D",
};

/**
 * Transfer Center feed — the latest ingested transfer rumours (lib/api
 * fetchTransfers): player, from → to clubs, a status chip, the source's own
 * probability when given, and the reporting source. Read-only; AI story-grouping
 * and our own probability estimate are a later phase.
 */
export function TransfersFeed() {
  const { lang, t } = useLang();
  const [rows, setRows] = useState<TransferRumour[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchTransfers(40)
      .then((data) => alive && setRows(data))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <EmptyState icon={<WifiOff size={24} />} message={t("loadErrorGames")} />;
  if (!rows) return <RowsSkeleton />;
  if (rows.length === 0) return <EmptyState icon={<ArrowLeftRight size={24} />} message={t("noGames")} />;

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <a
          key={r.id}
          href={r.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-[color:var(--chalk)]">{r.player_name}</span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: `${STATUS_COLOR[r.status]}22`, color: STATUS_COLOR[r.status] }}
            >
              {t(STATUS_KEY[r.status])}
              {r.source_probability !== null ? ` · ${r.source_probability}%` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[color:var(--chalk-dim)]">
            <span>{r.from_club ?? "—"}</span>
            <ArrowRight size={14} className="shrink-0" />
            <span className="text-[color:var(--chalk)]">{r.to_club}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[color:var(--chalk-dim)]">
            <span className="font-medium text-[color:var(--brand-accent)]">{r.source}</span>
            <span>·</span>
            <span dir="ltr">{timeAgo(r.reported_at, lang)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
