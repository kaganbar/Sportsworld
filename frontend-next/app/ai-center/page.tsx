"use client";

import { useState } from "react";

import PageShell from "@/components/page-shell";
import SimpleMarkdown from "@/components/simple-markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { useLang } from "@/lib/i18n";
import { ApiError, MasterAgentReport, fetchMasterAgentReport } from "@/lib/api";

// Real UI for the Master Agent — previously a "Coming Soon" placeholder
// despite the backend (MasterAgentService: a 10-tool orchestration loop
// across every other agent) being fully built and tested. A single
// query -> report exchange, not a multi-turn chat thread — matches the
// backend's own design (one cached report per query hash, not a
// conversation with memory).
export default function AiCenterPage() {
  const { t, lang } = useLang();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MasterAgentReport | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const report = await fetchMasterAgentReport(trimmed, lang);
      setResult(report);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell accent="#7c5cff" glow="#7c5cff" icon="🤖" label={t("nav_ai_center")} maxWidth="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold leading-snug text-white">{t("nav_ai_center")}</h1>
      <p className="mb-6 text-sm leading-relaxed text-white/60">{t("aiCenterIntro")}</p>

      <form onSubmit={handleSubmit} className="glass-panel mb-6 rounded-[20px] p-5">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("aiCenterPlaceholder")}
          rows={3}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white placeholder:text-white/35 focus:border-[var(--ai-accent)]/50 focus:outline-none"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={loading || query.trim().length === 0}
            className="rounded-full bg-[linear-gradient(135deg,var(--ai-accent),var(--brand-accent))] px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? t("aiCenterAsking") : t("aiCenterSubmit")}
          </button>
        </div>
      </form>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      )}

      {error && <p role="alert" className="rounded-md bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}

      {result && (
        <div className="rounded-[22px] border border-[var(--ai-accent)]/25 bg-[linear-gradient(160deg,rgba(124,92,255,0.10),rgba(255,255,255,0.02))] p-7 text-sm text-white/85 backdrop-blur-xl">
          <SimpleMarkdown text={result.report} />
          <p className="mt-6 border-t border-white/10 pt-4 text-xs text-white/40">
            {result.cached && `${t("aiCenterCached")} · `}
            {t("generatedBy")} {result.model}
          </p>
        </div>
      )}
    </PageShell>
  );
}
