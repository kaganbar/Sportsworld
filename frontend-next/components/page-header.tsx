"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

/** Shared header for the utility/feature pages — glowing icon tile + title. */
export function PageHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-10 flex items-center gap-4"
    >
      <span
        className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-[color:var(--brand-accent)] ring-1 ring-inset ring-white/10"
        style={{ background: "rgba(198,255,74,0.08)", boxShadow: "0 0 44px -14px var(--brand-accent)" }}
      >
        {icon}
      </span>
      <h1 className="font-display text-4xl tracking-wide text-[color:var(--chalk)] sm:text-5xl">
        {title}
      </h1>
    </motion.header>
  );
}
