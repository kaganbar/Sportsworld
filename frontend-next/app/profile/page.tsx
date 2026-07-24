"use client";

import { User } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProfilePanel } from "@/components/profile-panel";
import { useLang } from "@/lib/i18n";

export default function ProfilePage() {
  const { t } = useLang();
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeader icon={<User size={26} />} title={t("nav_profile")} />
      <ProfilePanel />
    </main>
  );
}
