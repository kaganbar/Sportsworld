"use client";

import { Newspaper } from "lucide-react";
import { NewsFeed } from "@/components/news-feed";
import { PageHeader } from "@/components/page-header";
import { useLang } from "@/lib/i18n";

export default function NewsPage() {
  const { t } = useLang();
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeader icon={<Newspaper size={26} />} title={t("nav_news")} />
      <NewsFeed />
    </main>
  );
}
