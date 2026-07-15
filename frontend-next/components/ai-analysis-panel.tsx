"use client";

import { useEffect, useState } from "react";

import { Lang, TKey, useLang } from "@/lib/i18n";
import { ApiError } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export interface AgentAnalysisBase {
  summary: string;
  key_factors: string[];
  confidence: "low" | "medium" | "high";
  model: string;
  created_at: string;
}

export interface ProbabilitySegment {
  key: string;
  label: string;
  pct: number;
  className: "home" | "draw" | "away";
}

const SEGMENT_STYLE: Record<ProbabilitySegment["className"], string> = {
  home: "bg-[linear-gradient(90deg,var(--brand-accent),var(--brand-accent-2))]",
  draw: "bg-slate-500",
  away: "bg-slate-800",
};

// Generic across every sport agent (Football/Basketball/Tennis/...): each caller
// supplies its own fetch function and how to turn its analysis into probability
// segments (3-way for football, 2-way for basketball/tennis), everything else
// (loading/error/summary/key-factors/confidence) is shared.
//
// Restyled per the design brief's "AI Match Insight" panel: a violet-tinted
// glass surface with a numeric confidence gauge. That gauge has no backend
// field to read (Analysis.confidence is only low/medium/high) — it's derived
// as the strongest predicted outcome's own probability (max of the segments
// already being rendered), which is both real data and a faithful stand-in
// for "how confident is this prediction." The win-probability bar and
// low/medium/high confidence footer are existing value, kept below the gauge
// rather than dropped.
export default function AiAnalysisPanel<T extends AgentAnalysisBase>({
  id,
  fetchAnalysis,
  probabilitySegments,
}: {
  id: string;
  fetchAnalysis: (id: string, lang: Lang) => Promise<T>;
  probabilitySegments: (analysis: T) => ProbabilitySegment[];
}) {
  const { t, lang } = useLang();
  const [analysis, setAnalysis] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setAnalysis(null);
    setError(null);
    fetchAnalysis(id, lang)
      .then(setAnalysis)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Analysis unavailable."))
      .finally(() => setLoading(false));
  }, [id, lang, fetchAnalysis]);

  const segments = analysis ? probabilitySegments(analysis) : [];
  const confidencePct = segments.length ? Math.round(Math.max(...segments.map((s) => s.pct))) : 0;

  return (
    <div className="mb-6 rounded-[22px] border border-[var(--ai-accent)]/25 bg-[linear-gradient(160deg,rgba(124,92,255,0.10),rgba(255,255,255,0.02))] p-7 backdrop-blur-xl">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="h-[26px] w-[26px] shrink-0 rounded-lg bg-[linear-gradient(135deg,var(--ai-accent),var(--brand-accent))]" />
        <div className="text-lg font-extrabold text-white">{t("aiInsightTitle")}</div>
      </div>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      )}
      {error && <p role="alert" className="text-sm text-white/60">{error}</p>}
      {analysis && (
        <>
          <div className="mb-1.5 flex items-center gap-3.5">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--ai-accent),var(--brand-accent))]"
                style={{ width: `${confidencePct}%` }}
              />
            </div>
            <div className="min-w-[3.5rem] text-end text-[15px] font-extrabold text-[var(--status-upcoming)]">
              {confidencePct}%
            </div>
          </div>
          <div className="mb-6 text-xs text-white/45">{t("predictionConfidence")}</div>

          <div className="flex h-9 overflow-hidden rounded-lg text-xs font-semibold text-white" title="Win probabilities">
            {segments.map((seg) => (
              <div
                key={seg.key}
                className={`flex items-center justify-center ${SEGMENT_STYLE[seg.className]}`}
                style={{ width: `${seg.pct}%` }}
              >
                {seg.pct}%
              </div>
            ))}
          </div>
          <div className="mb-6 mt-2 flex justify-between text-xs text-white/50">
            {segments.map((seg) => (
              <span key={seg.key}>{seg.label}</span>
            ))}
          </div>

          <div className="mb-6 space-y-3 text-sm leading-relaxed text-white/80">
            {analysis.summary.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          <div className="flex flex-col gap-3.5">
            {analysis.key_factors.map((factor, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ai-accent)]" />
                <span className="text-sm leading-relaxed text-white/85">{factor}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-white/40">
            {t("confidence")}: {t(`confidence_${analysis.confidence}` as TKey)} · {t("generatedBy")} {analysis.model}
          </p>
        </>
      )}
    </div>
  );
}
