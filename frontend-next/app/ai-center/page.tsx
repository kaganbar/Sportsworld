"use client";

import { Sparkles } from "lucide-react";
import { AiCenterPanel } from "@/components/ai-center-panel";
import { PageHeader } from "@/components/page-header";
import { useLang } from "@/lib/i18n";

export default function AiCenterPage() {
  const { t } = useLang();
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeader icon={<Sparkles size={26} />} title={t("nav_ai_center")} />
      <AiCenterPanel />
    </main>
  );
}
