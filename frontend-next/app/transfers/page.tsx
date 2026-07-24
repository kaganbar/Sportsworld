"use client";

import { ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TransfersFeed } from "@/components/transfers-feed";
import { useLang } from "@/lib/i18n";

export default function TransfersPage() {
  const { t } = useLang();
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeader icon={<ArrowLeftRight size={26} />} title={t("nav_transfers")} />
      <TransfersFeed />
    </main>
  );
}
