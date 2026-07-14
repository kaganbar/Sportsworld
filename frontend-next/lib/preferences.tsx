"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface PreferencesContextValue {
  focusMode: boolean;
  setFocusMode: (focusMode: boolean) => void;
  notif: boolean;
  setNotif: (notif: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  focusMode: false,
  setFocusMode: () => {},
  notif: true,
  setNotif: () => {},
});

// Settings screen state (Appearance: Cinematic/Focus, Match Notifications).
// Same Context+localStorage shape as lib/sidebar-state.tsx/lib/i18n.tsx:
// identical default on server and first client render, persisted value
// applied in a useEffect after mount to avoid a hydration mismatch.
//
// `notif` has no real push-notification backend behind it yet — it's a
// stored preference for future wiring, matching the design brief's own
// prototype-level fidelity for that one control (see the redesign plan's
// Settings section).
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusMode] = useState(false);
  const [notif, setNotif] = useState(true);

  useEffect(() => {
    if (window.localStorage.getItem("focusMode") === "true") setFocusMode(true);
    const storedNotif = window.localStorage.getItem("notif");
    if (storedNotif === "false") setNotif(false);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("focusMode", String(focusMode));
    // Read by .glass-panel::after's sheen (globals.css) and
    // components/ambient-glow.tsx — Focus softens both rather than
    // disabling them outright, per the Settings "Focus" framing.
    document.documentElement.style.setProperty("--focus-mode-mult", focusMode ? "0.4" : "1");
  }, [focusMode]);

  useEffect(() => {
    window.localStorage.setItem("notif", String(notif));
  }, [notif]);

  return (
    <PreferencesContext.Provider value={{ focusMode, setFocusMode, notif, setNotif }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => useContext(PreferencesContext);
