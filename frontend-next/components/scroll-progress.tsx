"use client";

import { useEffect } from "react";

// Writes --scroll-progress (0-1) onto the root element as the page scrolls,
// consumed by .glass-panel::after's sheen opacity in app/globals.css.
// Direct style.setProperty rather than React state — this fires on every
// scroll frame, and a CSS custom property write doesn't trigger a React
// re-render or React-side layout, just a compositor-level style recalc.
export default function ScrollProgress() {
  useEffect(() => {
    let raf = 0;
    function update() {
      raf = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      document.documentElement.style.setProperty("--scroll-progress", String(Math.min(1, Math.max(0, progress))));
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
