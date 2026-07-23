"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { NewsCluster, fetchNewsClusters } from "@/lib/api";

// Slim auto-scrolling masthead strip, global (no sport filter). A plain CSS
// `@keyframes` marquee (see .news-ticker-track in globals.css) rather than
// framer-motion — an infinite loop is exactly the case where letting the
// compositor run it is simpler/cheaper than driving it from JS every frame.
// The headline list is rendered twice back-to-back so translateX(-50%) (or,
// under RTL, the same keyframes played in reverse) loops seamlessly.
export default function NewsTicker() {
  const { lang } = useLang();
  const [news, setNews] = useState<NewsCluster[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchNewsClusters(lang, 15)
      .then((clusters) => {
        if (!cancelled) setNews(clusters);
      })
      .catch(() => {
        if (!cancelled) setNews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  if (!news || news.length === 0) return null;

  const track = [...news, ...news];

  return (
    <div className="px-2 pb-8">
      {/* Forced dir="ltr" so the translateX() keyframe math is unambiguous —
          the page's RTL/LTR "reading direction" is instead expressed by
          reversing which way the (identical) keyframes play, via the `rtl`
          class below, not by flipping this wrapper's own bidi direction. */}
      <div className="news-ticker glass-panel mx-auto max-w-6xl overflow-hidden rounded-full py-2.5" dir="ltr">
        <div className={cn("news-ticker-track flex w-max items-center gap-x-10 whitespace-nowrap px-5", lang === "he" && "rtl")}>
          {track.map((cluster, i) => (
            <a
              key={`${cluster.id}-${i}`}
              href={cluster.articles[0]?.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-2 text-sm font-medium text-white/80 transition hover:text-white"
            >
              <span aria-hidden="true" className="text-[var(--brand-accent)]">•</span>
              {cluster.headline}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
