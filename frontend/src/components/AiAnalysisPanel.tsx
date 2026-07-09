import { useEffect, useState } from "react";

import { Lang, TKey, useLang } from "../i18n";
import { ApiError } from "../lib/api";

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
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : "Analysis unavailable."),
      )
      .finally(() => setLoading(false));
  }, [id, lang, fetchAnalysis]);

  return (
    <section className="panel analysis-panel">
      <h3>{t("aiAnalysis")}</h3>
      {loading && <p className="muted">{t("analyzing")}</p>}
      {error && <p className="muted">{error}</p>}
      {analysis && (
        <>
          <div className="prob-bar" title="Win probabilities">
            {probabilitySegments(analysis).map((seg) => (
              <div key={seg.key} className={`prob ${seg.className}`} style={{ width: `${seg.pct}%` }}>
                {seg.pct}%
              </div>
            ))}
          </div>
          <div className="prob-legend">
            {probabilitySegments(analysis).map((seg) => (
              <span key={seg.key}>{seg.label}</span>
            ))}
          </div>
          {analysis.summary.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
          <ul className="key-factors">
            {analysis.key_factors.map((factor, i) => (
              <li key={i}>{factor}</li>
            ))}
          </ul>
          <p className="analysis-meta">
            {t("confidence")}: {t(`confidence_${analysis.confidence}` as TKey)} ·{" "}
            {t("generatedBy")} {analysis.model}
          </p>
        </>
      )}
    </section>
  );
}
