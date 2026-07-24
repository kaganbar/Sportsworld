"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useLang } from "@/lib/i18n";

/**
 * Bottom-center scroll indicator: a small uppercase label above a chevron that
 * bobs and fades on a loop. Label text comes from the preserved i18n (heroScroll
 * key), so it reads correctly in both EN and Hebrew.
 */
export function ScrollCue() {
  const { t } = useLang();
  return (
    <motion.div
      className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      initial={{ opacity: 0 }}
      // Delayed so it appears after the wordmark has settled in.
      animate={{ opacity: 1 }}
      transition={{ delay: 1.4, duration: 0.8 }}
    >
      <span className="text-[0.7rem] font-medium uppercase tracking-[0.35em] text-[color:var(--chalk-dim)]">
        {t("heroScroll")}
      </span>
      <motion.span
        animate={{ y: [0, 8, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="text-[color:var(--brand-accent)]"
      >
        <ChevronDown size={22} strokeWidth={2.5} />
      </motion.span>
    </motion.div>
  );
}
