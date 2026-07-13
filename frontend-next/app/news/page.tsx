"use client";

import { useEffect, useState } from "react";

import { useLang } from "@/lib/i18n";
import { NewsArticle, fetchNews } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ComingSoonPage } from "@/components/coming-soon";
import PageShell from "@/components/page-shell";

// A neutral "news wire" accent (cool blue) — News spans every sport, same
// reasoning as Transfers' neutral amber.
const ACCENT = "#4f8ef7";

function timeAgo(iso: string, lang: string) {
  return new Date(iso).toLocaleString(lang === "he" ? "he-IL" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NewsPage() {
  const { t, lang } = useLang();
  const [articles, setArticles] = useState<NewsArticle[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchNews(30)
      .then(setArticles)
      .catch(() => setError(true));
  }, []);

  // NEWS_API_KEY isn't configured (or the request failed) — no raw data to
  // show, fall back to the same "coming soon" shell every other new module uses.
  if (error || articles?.length === 0) {
    return <ComingSoonPage icon="📰" titleKey="nav_news" descriptionKey="desc_news" />;
  }

  return (
    <PageShell accent={ACCENT} icon="📰" label={t("nav_news")}>
      <h1 className="mb-1 text-2xl font-bold leading-snug text-white">{t("nav_news")}</h1>
      <p className="mb-6 text-sm leading-relaxed text-white/60">{t("newsRawNote")}</p>

      {!articles && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      <div className="space-y-3">
        {articles?.map((article) => (
          <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer">
            <Card variant="glass" className="p-4 transition hover:shadow-glow">
              <div className="mb-1 flex items-center justify-between text-xs text-white/50">
                <span>{article.source}</span>
                <span>{timeAgo(article.published_at, lang)}</span>
              </div>
              <CardContent className="p-0">
                <h2 className="font-semibold leading-snug text-white">{article.title}</h2>
                {article.summary && <p className="mt-1 text-sm leading-relaxed text-white/70">{article.summary}</p>}
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </PageShell>
  );
}
