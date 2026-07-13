import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppSidebar, MobileTopBar } from "@/components/app-sidebar";
import SportTransition from "@/components/sport-transition";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={rubik.variable}>
      <body className="bg-neutral-950 text-white">
        <Providers>
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
