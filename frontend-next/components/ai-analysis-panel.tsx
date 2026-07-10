"use client";

import { useEffect, useState } from "react";

import { Lang, TKey, useLang } from "@/lib/i18n";
import { ApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  home: "bg-[var(--sport-accent,#1e7b34)]",
  draw: "bg-slate-500",
  away: "bg-slate-800",
};

// Generic across every sport agent (Football/Basketball/Tennis/...): each caller
// supplies its own fetch function and how to turn its analysis into probability
// segments (3-way for football, 2-way for basketball/tennis), everything else
// (loading/error/summary/key-factors/confidence) is shared.
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

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{t("aiAnalysis")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}
        {error && <p className="text-sm text-muted-foreground">{error}</p>}
        {analysis && (
          <>
            <div className="flex h-9 overflow-hidden rounded-lg text-xs font-semibold text-white" title="Win probabilities">
              {probabilitySegments(analysis).map((seg) => (
                <div
                  key={seg.key}
                  className={`flex items-center justify-center ${SEGMENT_STYLE[seg.className]}`}
                  style={{ width: `${seg.pct}%` }}
                >
                  {seg.pct}%
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              {probabilitySegments(analysis).map((seg) => (
                <span key={seg.key}>{seg.label}</span>
              ))}
            </div>
            <div className="space-y-3 text-sm leading-relaxed">
              {analysis.summary.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {analysis.key_factors.map((factor, i) => (
                <li key={i}>{factor}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {t("confidence")}: {t(`confidence_${analysis.confidence}` as TKey)} · {t("generatedBy")} {analysis.model}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
