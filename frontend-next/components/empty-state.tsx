import { ReactNode } from "react";

/**
 * Consistent empty/no-data state — a muted icon over a short message, centered.
 * Replaces bare "no data" text so empty tabs still feel intentional.
 */
export function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.04] text-[color:var(--chalk-dim)] ring-1 ring-inset ring-white/10">
        {icon}
      </span>
      <p className="text-sm text-[color:var(--chalk-dim)]">{message}</p>
    </div>
  );
}
