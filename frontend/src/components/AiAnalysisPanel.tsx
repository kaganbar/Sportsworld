import { useEffect, useState } from "react";

import { TKey, useLang } from "../i18n";
import { Analysis, ApiError, fetchAnalysis } from "../lib/api";

export default function AiAnalysisPanel({
  gameId,
  homeName,
  awayName,
}: {
  gameId: string;
  homeName: string;
  awayName: string;
}) {
  const { t, lang } = useLang();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setAnalysis(null);
    setError(null);
    fetchAnalysis(gameId, lang)
      .then(setAnalysis)
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : "Analysis unavailable."),
      )
      .finally(() => setLoading(false));
  }, [gameId, lang]);

  return (
    <section className="panel analysis-panel">
      <h3>{t("aiAnalysis")}</h3>
      {loading && <p className="muted">{t("analyzing")}</p>}
      {error && <p className="muted">{error}</p>}
      {analysis && (
        <>
          <div className="prob-bar" title="Win / draw / win probabilities">
            <div className="prob home" style={{ width: `${analysis.probabilities.home_win}%` }}>
              {analysis.probabilities.home_win}%
            </div>
            <div className="prob draw" style={{ width: `${analysis.probabilities.draw}%` }}>
              {analysis.probabilities.draw}%
            </div>
            <div className="prob away" style={{ width: `${analysis.probabilities.away_win}%` }}>
              {analysis.probabilities.away_win}%
            </div>
          </div>
          <div className="prob-legend">
            <span>{homeName}</span>
            <span>{t("draw")}</span>
            <span>{awayName}</span>
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
