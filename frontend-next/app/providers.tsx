"use client";

import { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { SidebarProvider } from "@/lib/sidebar-state";

// Root layout.tsx is a Server Component by default, but LanguageProvider/
// SidebarProvider touch localStorage/document (client-only) — this thin
// wrapper is the standard Next.js App Router pattern for mounting client
// context providers from a server layout.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <SidebarProvider>{children}</SidebarProvider>
    </LanguageProvider>
  );
}
