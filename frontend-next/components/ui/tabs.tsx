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

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div role="tablist" className={cn("inline-flex flex-wrap items-center gap-2.5", className)}>
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
