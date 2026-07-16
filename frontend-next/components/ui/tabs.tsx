"use client";

// Hand-rolled, dependency-free Tabs — @radix-ui/react-tabs couldn't be
// installed (npm registry TLS verification is blocked in this dev
// environment), so this reimplements the same public API shape
// (Tabs/TabsList/TabsTrigger/TabsContent with value/defaultValue/
// onValueChange) via React context + basic ARIA roles, so consuming code
// is unaffected either way. Swap for the Radix primitive later if/when
// package installation is available, without touching call sites.
import * as React from "react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
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
  return (
    <TabsContext.Provider value={{ value, setValue }}>
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
// for the language toggle) vs. a faint neutral outline when inactive.
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
        "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/[0.14] text-[var(--status-upcoming)]"
          : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white/85",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = useTabsContext();
  if (ctx.value !== value) return null;
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}
