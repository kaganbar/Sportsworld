"use client";

import { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { SidebarProvider } from "@/lib/sidebar-state";
import { PreferencesProvider } from "@/lib/preferences";
import { AuthProvider } from "@/lib/auth-context";

/**
 * Client-side context providers wrapped around the whole app. Kept as its own
 * client component so app/layout.tsx can stay a server component (needed for
 * next/font). Both providers are preserved lib/ code reused as-is:
 * LanguageProvider (i18n + RTL) and SidebarProvider (collapse/mobile state).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <PreferencesProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </PreferencesProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
