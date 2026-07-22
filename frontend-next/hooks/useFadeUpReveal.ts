"use client";

import { useEffect, useRef } from "react";

// One-shot scroll reveal: adds the `visible` class (see globals.css's
// `.fade-up`/`.fade-up.visible`) the first time the element crosses 15% into
// the viewport, then stops observing — scrolling back up and down again
// shouldn't re-hide/re-trigger it.
export function useFadeUpReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return ref;
}
