import type { Lang } from "./i18n";

// Genuine relative time ("5 minutes ago" / "לפני 5 דקות"), with correct
// Hebrew singular/plural grammar for minute/hour/day. Falls back to an
// absolute date once a story is a week+ old — "47 days ago" isn't useful.
// Shared by app/news/page.tsx, app/transfers/page.tsx, and
// components/team-sport-competition-hub.tsx so all 3 surfaces agree.
export function timeAgo(iso: string, lang: Lang | string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const he = lang === "he";

  if (diffSec < 60) return he ? "הרגע" : "just now";

  if (diffMin < 60) {
    if (diffMin === 1) return he ? "לפני דקה" : "1 minute ago";
    return he ? `לפני ${diffMin} דקות` : `${diffMin} minutes ago`;
  }

  if (diffHour < 24) {
    if (diffHour === 1) return he ? "לפני שעה" : "1 hour ago";
    return he ? `לפני ${diffHour} שעות` : `${diffHour} hours ago`;
  }

  if (diffDay < 7) {
    if (diffDay === 1) return he ? "לפני יום" : "1 day ago";
    return he ? `לפני ${diffDay} ימים` : `${diffDay} days ago`;
  }

  return date.toLocaleString(he ? "he-IL" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
