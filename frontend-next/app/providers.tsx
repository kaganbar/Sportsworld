"use client";

import { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";

// Root layout.tsx is a Server Component by default, but LanguageProvider
// touches localStorage/document (client-only) — this thin wrapper is the
// standard Next.js App Router pattern for mounting a client context
// provider from a server layout.
export function Providers({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
