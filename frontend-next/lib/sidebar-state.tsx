"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

// Mirrors lib/i18n.tsx's LanguageProvider Context+localStorage shape, with
// one deliberate improvement: `collapsed` defaults to false on BOTH server
// and first client render rather than reading localStorage inside the
// useState initializer (that pattern risks a hydration mismatch the moment
// a persisted value differs from the server-rendered default) — the
// persisted value is applied in a useEffect after mount instead, same
// "imperative after mount" approach LanguageProvider already uses for
// document.documentElement.dir.
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("sidebarCollapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);

  // Scroll-lock while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <SidebarContext.Provider
      value={{ collapsed, setCollapsed, toggle: () => setCollapsed((c) => !c), mobileOpen, setMobileOpen }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
