"use client";

import PageShell from "@/components/page-shell";
import { useLang } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { cn } from "@/lib/utils";

function OptionButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition",
        active
          ? "border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/[0.14] text-[var(--status-upcoming)]"
          : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white/85",
      )}
    >
      {children}
    </button>
  );
}

function SettingsPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel mb-4 rounded-[20px] p-6">
      <div className="mb-4 text-[15px] font-bold text-white">{title}</div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { t, lang, setLang } = useLang();
  const { focusMode, setFocusMode, notif, setNotif } = usePreferences();

  return (
    <PageShell maxWidth="max-w-xl" icon="⚙️" label={t("nav_settings")}>
      <h1 className="mb-7 text-2xl font-extrabold text-white">{t("nav_settings")}</h1>

      <SettingsPanel title={t("language")}>
        <div className="flex gap-2.5">
          <OptionButton active={lang === "en"} onClick={() => setLang("en")}>
            English
          </OptionButton>
          <OptionButton active={lang === "he"} onClick={() => setLang("he")}>
            עברית
          </OptionButton>
        </div>
      </SettingsPanel>

      <SettingsPanel title={t("appearance")}>
        <div className="flex gap-2.5">
          <OptionButton active={!focusMode} onClick={() => setFocusMode(false)}>
            {t("cinematic")}
          </OptionButton>
          <OptionButton active={focusMode} onClick={() => setFocusMode(true)}>
            {t("focus")}
          </OptionButton>
        </div>
      </SettingsPanel>

      <div className="glass-panel flex items-center justify-between rounded-[20px] p-6">
        <div>
          <div className="mb-1 text-[15px] font-bold text-white">{t("notifications")}</div>
          <div className="text-[13px] text-white/55">{t("notificationsHint")}</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={notif}
          aria-label={t("notifications")}
          onClick={() => setNotif(!notif)}
          className={cn(
            "relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors",
            notif ? "bg-[linear-gradient(135deg,var(--brand-accent),var(--brand-accent-2))]" : "bg-white/15",
          )}
        >
          <span
            className={cn(
              "absolute top-[3px] h-5 w-5 rounded-full bg-white transition-all",
              notif ? "start-[23px]" : "start-[3px]",
            )}
          />
        </button>
      </div>
    </PageShell>
  );
}
