"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

// Wraps the whole app's routed content so switching between sports (or any
// route) crossfades instead of an abrupt swap — this is what makes
// "switching sports completely changes the atmosphere" feel premium rather
// than jarring. Lives in the root layout (app/layout.tsx), which persists
// across navigations — ThemeLayout itself is remounted per-page, so it
// can't be the thing that observes an outgoing/incoming transition.
// Keyed by pathname so AnimatePresence treats each route as a distinct
// entry/exit pair.
export default function SportTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.01 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
