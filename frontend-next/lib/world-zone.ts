"use client";

import { usePathname } from "next/navigation";
import { ZoneKey } from "@/three/zones";

export type ActiveZone = ZoneKey | "home";

// Same prefix-matching pattern components/app-sidebar.tsx's NavLinks
// already uses for active-link highlighting — reused, not reinvented.
export function useActiveZone(): ActiveZone {
  const pathname = usePathname();
  if (pathname === "/football" || pathname.startsWith("/football/")) return "football";
  if (pathname === "/basketball" || pathname.startsWith("/basketball/")) return "basketball";
  if (pathname === "/tennis" || pathname.startsWith("/tennis/")) return "tennis";
  if (pathname === "/baseball" || pathname.startsWith("/baseball/")) return "baseball";
  if (pathname === "/volleyball" || pathname.startsWith("/volleyball/")) return "volleyball";
  return "home";
}
