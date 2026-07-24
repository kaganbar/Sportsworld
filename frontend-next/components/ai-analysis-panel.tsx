"use client";

import { Sparkles } from "lucide-react";
import { useLang, type TKey } from "@/lib/i18n";

export interface ProbSegment {
  label: string;
  value: number;
  color: string;
}

/**
 * Shared AI match-analysis card. Renders a normalized stacked win-probability
 * bar (2-way for basketball/baseball/volleyball/tennis, 3-way with a draw for
 * football), the model's summary, key factors, and a confidence chip. Sport-
 * agnostic: callers pass the segments + text, so football's 3-way and the
 * others' 2-way splits share one component.
 */
export function AiAnalysisPanel({
  summary,
  keyFactors,
  confidence,
  model,
  segments,
}: {
  summary: string;
  keyFactors: string[];
  confidence: "low" | "medium" | "high";
  model: string;
  segments: ProbSegment[];
}) {
  const { t } = useLang();
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const confKey = `confidence_${confidence}` as TKey;

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <header className="flex items-center gap-2">
        <Sparkles size={18} className="text-[color:var(--brand-accent)]" />
        <h2 className="font-display text-xl tracking-wide text-[color:var(--chalk)]">
          {t("aiInsightTitle")}
        </h2>
      </header>

      {/* Win-probability bar */}
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--chalk-dim)]">
          {t("winProbabilities")}
        </p>
        <div dir="ltr" className="flex h-3 w-full overflow-hidden rounded-full">
          {segments.map((seg, i) => (
            <div
              key={i}
              style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }}
              title={`${seg.label} ${Math.round((seg.value / total) * 100)}%`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs text-[color:var(--chalk-dim)]">
              <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
              {seg.label} {Math.round((seg.value / total) * 100)}%
            </span>
          ))}
        </div>
      </div>

      <p className="whitespace-pre-wrap leading-relaxed text-[color:var(--chalk)]">{summary}</p>

      {keyFactors.length > 0 && (
        <ul className="flex flex-col gap-2">
          {keyFactors.map((f, i) => (
            <li key={i} className="flex gap-2 text-sm text-[color:var(--chalk-dim)]">
              <span className="text-[color:var(--brand-accent)]">▸</span>
              {f}
            </li>
          ))}
        </ul>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-xs text-[color:var(--chalk-dim)]">
        <span className="rounded-full bg-white/10 px-2 py-0.5">
          {t("confidence")}: {t(confKey)}
        </span>
        <span>
          {t("generatedBy")} {model}
        </span>
      </footer>
    </section>
  );
}
