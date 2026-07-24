"use client";

import { FormEvent, useState } from "react";
import { Sparkles } from "lucide-react";
import { MasterAgentReport, fetchMasterAgentReport } from "@/lib/api";
import { useLang } from "@/lib/i18n";

/**
 * AI Center — a single free-text box to the cross-sport Master Agent. Submitting
 * POSTs the query (fetchMasterAgentReport) and renders the synthesized report.
 * The backend runs in mock mode by default (zero API cost) and returns a
 * schema-shaped canned report; with an Anthropic key it's a real Claude call.
 */
export function AiCenterPanel() {
  const { lang, t } = useLang();
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<MasterAgentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(false);
    setReport(null);
    try {
      setReport(await fetchMasterAgentReport(q, lang));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm leading-relaxed text-[color:var(--chalk-dim)]">{t("aiCenterIntro")}</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("aiCenterPlaceholder")}
          rows={3}
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[color:var(--chalk)] placeholder:text-[color:var(--chalk-dim)] focus:border-[color:var(--brand-accent)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-[color:var(--brand-accent)] px-6 py-2.5 text-sm font-bold text-[#06140c] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Sparkles size={16} />
          {loading ? t("aiCenterAsking") : t("aiCenterSubmit")}
        </button>
      </form>

      {error && <p className="text-[color:var(--chalk-dim)]">{t("errorBody")}</p>}

      {report && (
        <article className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="whitespace-pre-wrap leading-relaxed text-[color:var(--chalk)]">
            {report.report}
          </p>
          <footer className="flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-[color:var(--chalk-dim)]">
            <span>
              {t("generatedBy")} {report.model}
            </span>
            {report.cached && (
              <span className="rounded-full bg-white/10 px-2 py-0.5">{t("aiCenterCached")}</span>
            )}
          </footer>
        </article>
      )}
    </div>
  );
}
