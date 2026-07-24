"use client";

import { Settings } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SettingsPanel } from "@/components/settings-panel";
import { useLang } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useLang();
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeader icon={<Settings size={26} />} title={t("nav_settings")} />
      <SettingsPanel />
    </main>
  );
}
