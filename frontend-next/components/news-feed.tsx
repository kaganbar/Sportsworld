"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Newspaper, WifiOff } from "lucide-react";
import { NewsArticle, fetchNews } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { timeAgo } from "@/lib/timeAgo";
import { EmptyState } from "./empty-state";
import { RowsSkeleton } from "./skeleton";

/**
 * News Center feed — the latest ingested headlines (lib/api fetchNews). Each
 * item links out to its source in a new tab, with a relative timestamp and the
 * source name. Read-only list; AI clustering/summarization is a later phase.
 */
export function NewsFeed() {
  const { lang, t } = useLang();
  const [news, setNews] = useState<NewsArticle[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchNews(40)
      .then((data) => alive && setNews(data))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <EmptyState icon={<WifiOff size={24} />} message={t("loadErrorGames")} />;
  if (!news) return <RowsSkeleton />;
  if (news.length === 0) return <EmptyState icon={<Newspaper size={24} />} message={t("noGames")} />;

  return (
    <div className="flex flex-col gap-3">
      {news.map((a) => (
        <a
          key={a.id}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-medium leading-snug text-[color:var(--chalk)]">{a.title}</h2>
            <ExternalLink size={16} className="mt-1 shrink-0 text-[color:var(--chalk-dim)]" />
          </div>
          {a.summary && (
            <p className="line-clamp-2 text-sm text-[color:var(--chalk-dim)]">{a.summary}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-[color:var(--chalk-dim)]">
            <span className="font-medium text-[color:var(--brand-accent)]">{a.source}</span>
            <span>·</span>
            <span dir="ltr">{timeAgo(a.published_at, lang)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
