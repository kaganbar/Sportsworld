"use client";

import { useEffect, useState } from "react";

import { TKey, useLang } from "@/lib/i18n";
import { TransferStory, TransferStatus, fetchTransferStories } from "@/lib/api";
import { timeAgo } from "@/lib/timeAgo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ComingSoonPage } from "@/components/coming-soon";
import PageShell from "@/components/page-shell";

// A neutral "transfer market" accent (amber/gold) — Transfers spans every
// sport, so it deliberately doesn't borrow any one sport's theme color, but
// still drives the shared --sport-accent/--sport-glow CSS vars the same way
// ThemeLayout does, so shadow-glow and the glass utilities read consistently.
const ACCENT = "#d4a017";

const statusKey: Record<TransferStatus, TKey> = {
  rumor: "transferStatus_rumor",
  official: "transferStatus_official",
  completed: "transferStatus_completed",
  denied: "transferStatus_denied",
};

export default function TransfersPage() {
  const { t, lang } = useLang();
  const [stories, setStories] = useState<TransferStory[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchTransferStories(lang, 30)
      .then(setStories)
      .catch(() => setError(true));
  }, [lang]);

  // No source chosen/reachable — same "coming soon" shell every other new module uses.
  if (error || stories?.length === 0) {
    return <ComingSoonPage icon="⇄" titleKey="nav_transfers" descriptionKey="desc_transfers" />;
  }

  return (
    <PageShell accent={ACCENT} icon="⇄" label={t("nav_transfers")}>
      <h1 className="mb-1 text-2xl font-bold leading-snug text-white">{t("nav_transfers")}</h1>
      <p className="mb-6 text-sm leading-relaxed text-white/60">{t("transfersRawNote")}</p>

      {!stories && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      <div className="space-y-3">
        {stories?.map((story) => (
          <Card key={story.id} variant="glass" className="p-4">
            <div className="mb-1 flex items-center justify-between text-xs text-white/50">
              <span>{timeAgo(story.updated_at, lang)}</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary">{t(statusKey[story.status])}</Badge>
                {story.estimated_probability != null && (
                  <Badge className="border-transparent bg-[var(--brand-accent)]/20 text-[var(--status-upcoming)]">
                    {story.estimated_probability}%
                  </Badge>
                )}
              </div>
            </div>
            <CardContent className="p-0">
              <h2 className="font-semibold text-white">{story.player_name}</h2>
              {/* A story can have reports but not yet an AI-scored summary
                  (mock mode, or a pending background job) — fall back to a
                  plain from/to line built from the story's own fields so the
                  card never renders blank. */}
              <p className="mt-1 text-sm leading-relaxed text-white/70">
                {story.ai_summary ?? `${story.from_club ? `${story.from_club} → ` : ""}${story.to_club}`}
              </p>

              {story.reports.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-white/10 pt-2">
                  {story.reports.map((report, i) => (
                    <li key={`${report.source_url}-${i}`} className="text-xs text-white/50">
                      <a
                        href={report.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white hover:underline"
                      >
                        {report.source} — {report.description}
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
