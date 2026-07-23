import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import dynamic from "next/dynamic";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { AppSidebar, MobileTopBar } from "@/components/app-sidebar";
import SportTransition from "@/components/sport-transition";
import ScrollProgress from "@/components/scroll-progress";
import AmbientGlow from "@/components/ambient-glow";
import ParallaxFallback from "@/components/parallax-fallback";

// next/dynamic with ssr:false is the actual "client-only, never rendered
// on the server" boundary in Next.js — PersistentWorldCanvas touches
// `document`/WebGL at call time. Mounted ONCE here (not per-page) so the
// 3D world persists across navigation — see three/PersistentWorld.tsx.
const PersistentWorldCanvas = dynamic(() => import("@/three/PersistentWorldCanvas"), { ssr: false });

// One family, used consistently, rather than a font-pairing gimmick — Rubik
// has genuine Hebrew glyph support (this app is RTL/Hebrew-first) and a
// modern geometric feel that reads as premium at both display and body sizes.
const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "SportsWorld",
  description: "AI-powered sports platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read on the server so the very first paint already has the right
  // lang/dir — LanguageProvider defaults to "he" client-side too, and
  // mirrors this same cookie on every change (see lib/i18n.tsx), so the
  // two never disagree after the first language switch.
  const cookieLang = (await cookies()).get("lang")?.value;
  const lang = cookieLang === "en" ? "en" : "he";

  return (
    <html lang={lang} dir={lang === "he" ? "rtl" : "ltr"} className={rubik.variable}>
      <body className="bg-neutral-950 text-white">
        <Providers>
          <ScrollProgress />
          <ParallaxFallback />
          <PersistentWorldCanvas />
          <AmbientGlow />
          {/* Shared scrim — previously duplicated per-page in
              ThemeLayout/PageShell, now one instance for the whole
              persistent world, same darkening-for-readability role. */}
          <div className="pointer-events-none fixed inset-0 -z-[5] bg-gradient-to-b from-black/30 via-black/10 to-black/35 backdrop-blur-[2px]" />
          <div className="flex min-h-screen">
            <AppSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <MobileTopBar />
              <SportTransition>{children}</SportTransition>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
