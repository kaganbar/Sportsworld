import type { Metadata } from "next";
import { Anton, Rubik } from "next/font/google";
import { Providers } from "./providers";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

/**
 * Anton — condensed, heavy display face for the SportsWorld wordmark only.
 * Latin-only (the brand name stays Latin in both languages). Bound to
 * --font-anton, consumed by tailwind's `font-display` + theme/tokens.ts.
 */
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

/**
 * Rubik — the humanist sans for all UI/body text. Chosen over a Latin-only
 * face because it ships full Hebrew glyph coverage, so the RTL/Hebrew-default
 * UI renders in one consistent typeface. Bound to --font-rubik.
 */
const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SportsWorld",
  description: "Pick a sport. Get today's games and AI match analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Static "he"/"rtl" on the server + first client render. The preserved
  // LanguageProvider (lib/i18n.tsx) flips document.documentElement.dir/lang on
  // mount for a persisted "en" — its own documented hydration strategy, and it
  // keeps the Tauri static export working (cookies() would break output:export).
  return (
    <html lang="he" dir="rtl" className={`${anton.variable} ${rubik.variable}`}>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
