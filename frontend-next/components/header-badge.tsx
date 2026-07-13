import { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

// The sport/section badge row shown just under the sidebar/top chrome —
// shared by ThemeLayout (per-sport pages) and PageShell (every other page),
// so both read from one implementation instead of two hand-copies.
export function HeaderBadge({ icon, label, sub }: { icon: ReactNode; label: string; sub?: string }) {
  return (
    <div className="relative flex items-center justify-center border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-sm">
      <Badge className="bg-white/15 text-white" variant="outline">
        {icon} {label}
        {sub ? ` · ${sub}` : ""}
      </Badge>
    </div>
  );
}
