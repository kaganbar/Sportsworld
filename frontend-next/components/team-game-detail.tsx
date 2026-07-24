"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Game,
  PastResult,
  fetchAnalysis,
  fetchBaseballAnalysis,
  fetchBaseballGameDetail,
  fetchBasketballAnalysis,
  fetchBasketballGameDetail,
  fetchGameDetail,
  fetchVolleyballAnalysis,
  fetchVolleyballGameDetail,
} from "@/lib/api";
import { WifiOff } from "lucide-react";
import { useLiveGame } from "@/hooks/useLiveGame";
import { useLang } from "@/lib/i18n";
import { SportKey, sportsTheme } from "@/theme/sportsTheme";
import { AiAnalysisPanel, ProbSegment } from "./ai-analysis-panel";
import { EmptyState } from "./empty-state";
import { DetailSkeleton, Skeleton } from "./skeleton";
import { TeamBadge } from "./team-badge";

type TeamSportKey = Exclude<SportKey, "tennis">;

interface CommonDetail {
  game: Game;
  recent_form: { home: PastResult[]; away: PastResult[] };
  head_to_head: PastResult[];
}
interface AnyAnalysis {
  summary: string;
  key_factors: string[];
  confidence: "low" | "medium" | "high";
  model: string;
  probabilities: { home_win: number; away_win: number; draw?: number };
}
interface GameTick {
  home_score?: number;
  away_score?: number;
  minute?: number;
  status?: Game["status"];
}

const DETAIL_FETCHERS: Record<TeamSportKey, (id: string, lang: "en" | "he") => Promise<CommonDetail>> = {
  football: (id, l) => fetchGameDetail(id, l),
  basketball: (id, l) => fetchBasketballGameDetail(id, l),
  baseball: (id, l) => fetchBaseballGameDetail(id, l),
  volleyball: (id, l) => fetchVolleyballGameDetail(id, l),
};
const ANALYSIS_FETCHERS: Record<TeamSportKey, (id: string, lang: "en" | "he") => Promise<AnyAnalysis>> = {
  football: (id, l) => fetchAnalysis(id, l),
  basketball: (id, l) => fetchBasketballAnalysis(id, l),
  baseball: (id, l) => fetchBaseballAnalysis(id, l),
  volleyball: (id, l) => fetchVolleyballAnalysis(id, l),
};

export function TeamGameDetail({ sport, id }: { sport: TeamSportKey; id: string }) {
  const { lang, t } = useLang();
  const [detail, setDetail] = useState<CommonDetail | null>(null);
  const [analysis, setAnalysis] = useState<AnyAnalysis | null>(null);
  const [detailErr, setDetailErr] = useState(false);
  const [tick, setTick] = useState<GameTick | null>(null);
  const accent = sportsTheme[sport].accent;

  const liveWsPath =
    detail && detail.game.status === "live" ? `/ws/games/${sport}/${detail.game.id}/` : null;
  useLiveGame(liveWsPath, (p) => {
    const next: GameTick = { home_score: p.home_score, away_score: p.away_score, status: p.status };
    if (typeof p.minute === "number") next.minute = p.minute;
    setTick(next);
  });

  useEffect(() => {
    let alive = true;
    DETAIL_FETCHERS[sport](id, lang)
      .then((d) => alive && setDetail(d))
      .catch(() => alive && setDetailErr(true));
    // Analysis is a separate (slower, AI) call — best-effort, never blocks the page.
    ANALYSIS_FETCHERS[sport](id, lang)
      .then((a) => alive && setAnalysis(a))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [sport, id, lang]);

  if (detailErr) return <EmptyState icon={<WifiOff size={24} />} message={t("loadErrorGame")} />;
  if (!detail) return <DetailSkeleton />;

  const game: Game = tick ? { ...detail.game, ...tick } : detail.game;
  const live = game.status === "live";
  const finished = game.status === "finished";
  const hasScore = game.home_score !== null && game.away_score !== null;

  const segments: ProbSegment[] | null = analysis
    ? analysis.probabilities.draw !== undefined
      ? [
          { label: game.home_team.name, value: analysis.probabilities.home_win, color: game.home_team.primary_color || accent },
          { label: t("draw"), value: analysis.probabilities.draw, color: "#8a94a6" },
          { label: game.away_team.name, value: analysis.probabilities.away_win, color: game.away_team.primary_color || "#cbd5e1" },
        ]
      : [
          { label: game.home_team.name, value: analysis.probabilities.home_win, color: game.home_team.primary_color || accent },
          { label: game.away_team.name, value: analysis.probabilities.away_win, color: game.away_team.primary_color || "#cbd5e1" },
        ]
    : null;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href={sportsTheme[sport].route} className="mb-6 inline-block text-sm text-[color:var(--chalk-dim)] hover:text-[color:var(--chalk)]">
        {t("back")} {t(sportsTheme[sport].labelKey)}
      </Link>

      {/* Score header */}
      <div className="mb-8 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <span className="text-xs text-[color:var(--chalk-dim)]">{game.competition}</span>
        <div className="flex w-full items-center justify-between gap-4">
          <TeamSide sport={sport} name={game.home_team.name} team={game.home_team} />
          <div className="flex flex-col items-center">
            {(live || finished) && hasScore ? (
              <span dir="ltr" className="font-display text-4xl text-[color:var(--chalk)]">
                {game.home_score}-{game.away_score}
              </span>
            ) : (
              <span dir="ltr" className="font-display text-2xl text-[color:var(--chalk)]">
                {new Date(game.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {live && (
              <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-red-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                {game.minute !== null ? `${game.minute}'` : t("liveNow")}
              </span>
            )}
            {finished && <span className="mt-1 text-xs text-[color:var(--chalk-dim)]">{t("statusFinished")}</span>}
          </div>
          <TeamSide sport={sport} name={game.away_team.name} team={game.away_team} />
        </div>
      </div>

      {/* AI analysis */}
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

      {/* Recent form + H2H */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormList title={game.home_team.name} results={detail.recent_form.home} />
        <FormList title={game.away_team.name} results={detail.recent_form.away} />
      </div>
      {detail.head_to_head.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 font-display text-lg tracking-wide text-[color:var(--chalk)]">{t("h2h")}</h3>
          <div className="flex flex-col gap-2">
            {detail.head_to_head.map((r, i) => (
              <ResultRow key={i} r={r} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function TeamSide({ sport, name, team }: { sport: TeamSportKey; name: string; team: Game["home_team"] }) {
  return (
    <Link href={`/${sport}/teams/${team.id}`} className="flex flex-1 flex-col items-center gap-2 text-center hover:opacity-80">
      <TeamBadge team={team} size={48} />
      <span className="text-sm font-medium text-[color:var(--chalk)]">{name}</span>
    </Link>
  );
}

function FormList({ title, results }: { title: string; results: PastResult[] }) {
  const { t } = useLang();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[color:var(--chalk)]">{title}</h3>
      {results.length === 0 ? (
        <p className="text-sm text-[color:var(--chalk-dim)]">{t("noH2h")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {results.slice(0, 5).map((r, i) => (
            <ResultRow key={i} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultRow({ r }: { r: PastResult }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-[color:var(--chalk-dim)]">
      <span className="truncate">{r.home_team}</span>
      <span dir="ltr" className="shrink-0 font-medium text-[color:var(--chalk)]">
        {r.home_score}-{r.away_score}
      </span>
      <span className="truncate text-end">{r.away_team}</span>
    </div>
  );
}

