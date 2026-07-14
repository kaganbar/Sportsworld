"use client";

import { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { HeaderBadge } from "@/components/header-badge";

// Neutral default accent for pages with no natural sport/competition tie
// (Home, Other Sports, Profile, Settings, AI Center) — a soft violet
// matching the Galaxy palette rather than any one sport's color.
const DEFAULT_ACCENT = "#7c6cff";

// The canonical page wrapper for every page NOT wrapped in ThemeLayout.
// `className="dark"` here is deliberate and scoped: it makes shadcn's
// bg-card/text-card-foreground/etc. resolve to globals.css's `.dark` block
// ONLY inside this subtree, without touching ThemeLayout or anything it
// renders (GameCard/AiAnalysisPanel/standings tables deliberately keep
// using the light-mode "white card" for readability contrast against busy
// 3D backgrounds — that pattern must not change here). The 3D
// canvas/scrim/background used to be per-page (bg-galaxy-shell) — now the
// persistent world + shared scrim live once in app/layout.tsx, so this
// component stays transparent and lets that global backdrop show through
// (parked at the pulled-back "galaxy" shot on every non-sport page, see
// three/zones.ts's HOME_CAMERA).
export default function PageShell({
  accent = DEFAULT_ACCENT,
  glow,
  icon,
  label,
  maxWidth = "max-w-3xl",
  className,
  children,
}: {
  accent?: string;
  glow?: string;
  icon?: ReactNode;
  label?: string;
  maxWidth?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("dark relative z-0 min-h-screen pb-16 text-white", className)}
      style={{ "--sport-accent": accent, "--sport-glow": glow ?? accent } as CSSProperties}
    >
      {icon && label && <HeaderBadge icon={icon} label={label} />}
      <div className={cn("relative mx-auto px-4 py-6", maxWidth)}>{children}</div>
    </div>
  );
}
