"use client";

import { useEffect, useState } from "react";

import { useLang } from "@/lib/i18n";
import { NewsCluster, fetchNewsClusters } from "@/lib/api";
import { timeAgo } from "@/lib/timeAgo";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ComingSoonPage } from "@/components/coming-soon";
import PageShell from "@/components/page-shell";

// A neutral "news wire" accent (cool blue) — News spans every sport, same
// reasoning as Transfers' neutral amber.
const ACCENT = "#4f8ef7";

export default function NewsPage() {
  const { t, lang } = useLang();
  const [clusters, setClusters] = useState<NewsCluster[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchNewsClusters(lang, 30)
      .then(setClusters)
      .catch(() => setError(true));
  }, [lang]);

  // No clusters (agent hasn't ingested anything yet, or the request
  // failed) — fall back to the same "coming soon" shell every other new
  // module uses.
  if (error || clusters?.length === 0) {
    return <ComingSoonPage icon="📰" titleKey="nav_news" descriptionKey="desc_news" />;
  }

  return (
    <PageShell accent={ACCENT} icon="📰" label={t("nav_news")}>
      <h1 className="mb-1 text-2xl font-bold leading-snug text-white">{t("nav_news")}</h1>
      <p className="mb-6 text-sm leading-relaxed text-white/60">{t("newsRawNote")}</p>

      {!clusters && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      <div className="space-y-3">
        {clusters?.map((cluster) => (
          <Card key={cluster.id} variant="glass" className="p-4">
            <div className="mb-1 text-xs text-white/50">{timeAgo(cluster.updated_at, lang)}</div>
            <CardContent className="p-0">
              <h2 className="font-semibold leading-snug text-white">{cluster.headline}</h2>
              {cluster.summary && <p className="mt-1 text-sm leading-relaxed text-white/70">{cluster.summary}</p>}

              {cluster.articles.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-white/10 pt-2">
                  {cluster.articles.map((article, i) => (
                    <li key={`${article.url}-${i}`} className="text-xs text-white/50">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white hover:underline"
                      >
                        {article.source} — {article.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
