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
    <div role="tablist" className={cn("glass-panel inline-flex flex-wrap items-center gap-1 rounded-lg p-1", className)}>
      {children}
    </div>
  );
}

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
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-[var(--sport-accent)] text-white shadow-sm" : "text-white/70 hover:text-white",
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
