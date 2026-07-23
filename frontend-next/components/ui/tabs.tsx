"use client";

// Hand-rolled, dependency-free Tabs — @radix-ui/react-tabs couldn't be
// installed (npm registry TLS verification is blocked in this dev
// environment), so this reimplements the same public API shape
// (Tabs/TabsList/TabsTrigger/TabsContent with value/defaultValue/
// onValueChange) via React context + basic ARIA roles, so consuming code
// is unaffected either way. Swap for the Radix primitive later if/when
// package installation is available, without touching call sites.
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  // One shared `layoutId` per <Tabs> instance (not a single hardcoded
  // string) so the sliding-indicator animation below stays scoped to its
  // own tab group — two <Tabs> rendered on the same page at once would
  // otherwise fight over one layoutId and the indicator would visibly jump
  // between them instead of sliding within each independently.
  indicatorId: string;
}
const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs.* components must be used within <Tabs>");
  return ctx;
}

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
  const value = controlledValue ?? uncontrolled;
  const setValue = (v: string) => {
    if (controlledValue === undefined) setUncontrolled(v);
    onValueChange?.(v);
  };
  const indicatorId = React.useId();
  return (
    <TabsContext.Provider value={{ value, setValue, indicatorId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// WAI-ARIA APG Tabs pattern: arrow keys move focus AND activate (this
// widget's simple pill-tab style already activates on click, so automatic
// activation on arrow-move matches, rather than requiring a second Enter/
// Space). Home/End jump to the first/last tab. Direction is RTL-aware —
// this app defaults to Hebrew, and the APG recommends swapping Left/Right
// semantics under RTL so the arrow that "visually" advances still does.
export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  const { lang } = useLang();
  const listRef = React.useRef<HTMLDivElement>(null);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const forwardKey = lang === "he" ? "ArrowLeft" : "ArrowRight";
    const backwardKey = lang === "he" ? "ArrowRight" : "ArrowLeft";
    if (![forwardKey, backwardKey, "Home", "End"].includes(e.key)) return;

    const tabs = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
    if (tabs.length === 0) return;
    const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);

    let nextIndex: number;
    if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = tabs.length - 1;
    else if (e.key === forwardKey) nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % tabs.length;
    else nextIndex = currentIndex < 0 ? 0 : (currentIndex - 1 + tabs.length) % tabs.length;

    e.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  };

  return (
    <div ref={listRef} role="tablist" onKeyDown={onKeyDown} className={cn("inline-flex flex-wrap items-center gap-2.5", className)}>
      {children}
    </div>
  );
}

// Pill buttons with the design brief's exact active/inactive treatment: a
// translucent brand-accent tint (not a solid fill — that look is reserved
// for the language toggle) vs. a faint neutral outline when inactive. The
// tint itself is now a `layoutId`-shared `motion.span`, present only inside
// whichever trigger is currently active — framer-motion detects it
// unmounting from the old trigger and mounting in the new one on the same
// render and animates the position/size delta between them, which is what
// produces the sliding-pill effect (no manual DOM measurement needed).
export function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = useTabsContext();
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      data-state={active ? "active" : "inactive"}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "relative rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "border-[var(--brand-accent)]/40 text-[var(--status-upcoming)]"
          : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white/85",
        className,
      )}
    >
      {active && (
        <motion.span
          layoutId={ctx.indicatorId}
          className="absolute inset-0 -z-10 rounded-full bg-[var(--brand-accent)]/[0.14]"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

// Each TabsContent owns its own AnimatePresence boundary rather than one
// shared at the <Tabs> level — call sites render every panel as a sibling
// JSX element (not a single switched child), so there's no one place
// upstream to wrap; this way each panel independently animates in when its
// own `ctx.value === value` becomes true and animates out when it stops,
// which is exactly the exit-before-unmount behavior AnimatePresence exists
// for, without needing to restructure how callers list their tabs.
export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = useTabsContext();
  return (
    <AnimatePresence mode="wait">
      {ctx.value === value && (
        <motion.div
          key={value}
          role="tabpanel"
          className={className}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
