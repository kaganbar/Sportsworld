"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  TennisMatchDetail as TennisDetail,
  TennisAnalysis,
  TennisMatchResult,
  fetchTennisAnalysis,
  fetchTennisMatchDetail,
} from "@/lib/api";
import { WifiOff } from "lucide-react";
import { useLiveGame } from "@/hooks/useLiveGame";
import { useLang } from "@/lib/i18n";
import { sportsTheme } from "@/theme/sportsTheme";
import { EmptyState } from "./empty-state";
import { DetailSkeleton, Skeleton } from "./skeleton";

interface TennisTick {
  status?: "scheduled" | "live" | "finished";
  set_number?: number;
  p1?: number;
  p2?: number;
}
import { AiAnalysisPanel, ProbSegment } from "./ai-analysis-panel";

export function TennisMatchDetail({ id }: { id: string }) {
  const { lang, t } = useLang();
  const [detail, setDetail] = useState<TennisDetail | null>(null);
  const [analysis, setAnalysis] = useState<TennisAnalysis | null>(null);
  const [err, setErr] = useState(false);
  const [live, setLive] = useState<TennisTick | null>(null);
  const accent = sportsTheme.tennis.accent;

  const wsPath = detail && detail.match.status === "live" ? `/ws/tennis/${detail.match.id}/` : null;
  useLiveGame(wsPath, (p) =>
    setLive({ status: p.status, set_number: p.set_number, p1: p.player1_games, p2: p.player2_games }),
  );

  useEffect(() => {
    let alive = true;
    fetchTennisMatchDetail(id, lang)
      .then((d) => alive && setDetail(d))
      .catch(() => alive && setErr(true));
    fetchTennisAnalysis(id, lang)
      .then((a) => alive && setAnalysis(a))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, lang]);

  if (err) return <EmptyState icon={<WifiOff size={24} />} message={t("loadErrorGame")} />;
  if (!detail) return <DetailSkeleton />;

  const match = live?.status ? { ...detail.match, status: live.status } : detail.match;
  // Overlay the live set's games onto the loaded sets (update in place, or
  // append if the tick is for a set not yet in the loaded detail).
  let sets = detail.sets;
  if (live && live.set_number != null && live.p1 != null && live.p2 != null) {
    const sn = live.set_number;
    sets = sets.some((s) => s.set_number === sn)
      ? sets.map((s) => (s.set_number === sn ? { ...s, player1_games: live.p1!, player2_games: live.p2! } : s))
      : [...sets, { set_number: sn, player1_games: live.p1, player2_games: live.p2 }];
  }
  const finished = match.status === "finished";

  const segments: ProbSegment[] | null = analysis
    ? [
        { label: match.player1.name, value: analysis.probabilities.player1_win, color: accent },
        { label: match.player2.name, value: analysis.probabilities.player2_win, color: "#cbd5e1" },
      ]
    : null;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href="/tennis" className="mb-6 inline-block text-sm text-[color:var(--chalk-dim)] hover:text-[color:var(--chalk)]">
        {t("back")} {t("sport_tennis")}
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <span className="text-center text-xs text-[color:var(--chalk-dim)]">
          {match.tournament} · {match.round}
        </span>
        <PlayerLine name={match.player1.name} won={finished && match.winner_id === match.player1.id} sets={sets.map((s) => s.player1_games)} />
        <PlayerLine name={match.player2.name} won={finished && match.winner_id === match.player2.id} sets={sets.map((s) => s.player2_games)} />
      </div>

      {segments ? (
        <AiAnalysisPanel
          summary={analysis!.summary}
          keyFactors={analysis!.key_factors}
          confidence={analysis!.confidence}
          model={analysis!.model}
          segments={segments}
        />
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TennisFormList title={match.player1.name} results={detail.recent_form.player1} />
        <TennisFormList title={match.player2.name} results={detail.recent_form.player2} />
      </div>
    </main>
  );
}

function PlayerLine({ name, won, sets }: { name: string; won: boolean; sets: number[] }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`truncate ${won ? "font-bold text-[color:var(--chalk)]" : "font-medium text-[color:var(--chalk-dim)]"}`}>
        {won && <span className="me-1.5 text-[color:var(--brand-accent)]">✓</span>}
        {name}
      </span>
      <span dir="ltr" className="flex shrink-0 gap-2 font-display text-lg text-[color:var(--chalk)]">
        {sets.map((g, i) => (
          <span key={i}>{g}</span>
        ))}
      </span>
    </div>
  );
}

function TennisFormList({ title, results }: { title: string; results: TennisMatchResult[] }) {
  const { t } = useLang();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[color:var(--chalk)]">{title}</h3>
      {results.length === 0 ? (
        <p className="text-sm text-[color:var(--chalk-dim)]">{t("noH2h")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {results.slice(0, 5).map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs text-[color:var(--chalk-dim)]">
              <span className="truncate">
                {r.player1} <span className="opacity-60">vs</span> {r.player2}
              </span>
              {r.winner && <span className="shrink-0 text-[color:var(--chalk)]">{r.winner}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

