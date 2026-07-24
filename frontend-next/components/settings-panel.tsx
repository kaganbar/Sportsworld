"use client";

import { LangToggle, useLang } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";

/** A labeled settings row with a control on the trailing edge. */
function Row({ label, hint, control }: { label: string; hint?: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-5 last:border-b-0">
      <div>
        <p className="font-medium text-[color:var(--chalk)]">{label}</p>
        {hint && <p className="mt-0.5 text-sm text-[color:var(--chalk-dim)]">{hint}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/** iOS-style toggle switch. */
function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-[color:var(--brand-accent)]" : "bg-white/15"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "start-[1.375rem]" : "start-0.5"}`}
      />
    </button>
  );
}

/**
 * Settings — language, appearance (Cinematic vs Focus), and match
 * notifications. Appearance + notifications are wired to the preserved
 * PreferencesProvider (localStorage-persisted); Focus dims ambient effects.
 */
export function SettingsPanel() {
  const { t } = useLang();
  const { focusMode, setFocusMode, notif, setNotif } = usePreferences();

  return (
    <div className="max-w-2xl rounded-2xl border border-white/10 bg-white/[0.02] px-6">
      <Row label={t("language")} control={<LangToggle />} />
      <Row
        label={t("appearance")}
        hint={focusMode ? t("focus") : t("cinematic")}
        control={<Switch on={!focusMode} onChange={(v) => setFocusMode(!v)} label={t("appearance")} />}
      />
      <Row
        label={t("notifications")}
        hint={t("notificationsHint")}
        control={<Switch on={notif} onChange={setNotif} label={t("notifications")} />}
      />
    </div>
  );
}
