"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  Bot,
  ChevronLeft,
  ChevronRight,
  Menu,
  Newspaper,
  Settings,
  UserRound,
  X,
} from "lucide-react";

import { LangToggle, TKey, useLang } from "@/lib/i18n";
import { SportKey, sportsTheme } from "@/theme/sportsTheme";
import { useSidebar } from "@/lib/sidebar-state";
import { cn } from "@/lib/utils";

// Absorbs the old top nav's content (brand, sport links, Other Sports, the
// 5 module links, lang toggle) into a real persistent sidebar — a
// confirmed scope decision, not a re-skin of the old top bar (which is
// deleted, see site-header.tsx removal).
const MODULE_LINKS: { href: string; labelKey: TKey; icon: typeof ArrowLeftRight }[] = [
  { href: "/transfers", labelKey: "nav_transfers", icon: ArrowLeftRight },
  { href: "/news", labelKey: "nav_news", icon: Newspaper },
  { href: "/ai-center", labelKey: "nav_ai_center", icon: Bot },
  { href: "/profile", labelKey: "nav_profile", icon: UserRound },
  { href: "/settings", labelKey: "nav_settings", icon: Settings },
];

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useLang();

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4">
      {(Object.keys(sportsTheme) as SportKey[]).map((key) => {
        const active = pathname === `/${key}` || pathname.startsWith(`/${key}/`);
        return (
          <Link
            key={key}
            href={`/${key}`}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
              active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
            )}
            style={active ? { borderInlineStart: `2px solid ${sportsTheme[key].accent}` } : undefined}
          >
            <span className="text-lg">{sportsTheme[key].emoji}</span>
            {!collapsed && <span className="truncate">{t(`sport_${key}` as TKey)}</span>}
          </Link>
        );
      })}

      <div className="my-2 border-t border-white/10" />

      {MODULE_LINKS.map(({ href, labelKey, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
              active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{t(labelKey)}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar() {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const { lang, t } = useLang();
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close the mobile drawer automatically on navigation.
  useEffect(() => setMobileOpen(false), [pathname, setMobileOpen]);

  // The drawer is a real modal overlay (backdrop + slide-over), so it needs
  // the two behaviors every modal is expected to have: Escape closes it,
  // and focus moves into it on open (here, straight to the close button —
  // the first and most useful stop) rather than staying on the now-hidden
  // trigger button behind the backdrop.
  useEffect(() => {
    if (!mobileOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, setMobileOpen]);

  // Collapse-toggle chevron must flip with reading direction — "collapse
  // toward the edge" points opposite ways in RTL vs LTR.
  const rtl = lang === "he";
  const CollapseIcon = collapsed ? (rtl ? ChevronLeft : ChevronRight) : rtl ? ChevronRight : ChevronLeft;

  return (
    <>
      {/* Desktop: persistent glass column */}
      <aside
        className={cn(
          "glass-panel sticky top-0 hidden h-screen shrink-0 flex-col md:flex",
          "transition-[width] duration-300",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          {!collapsed && (
            <Link href="/" className="text-lg font-bold text-white">
              SportsWorld
            </Link>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle sidebar"
            className="rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <CollapseIcon className="h-4 w-4" />
          </button>
        </div>

        <NavLinks collapsed={collapsed} />

        <div
          className={cn(
            "border-t border-white/10 px-4 py-4",
            collapsed ? "flex flex-col items-center gap-3" : "flex items-center justify-between gap-2",
          )}
        >
          <LangToggle />
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex items-center gap-2 rounded-full border border-white/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-md transition hover:text-white"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>
        </div>
      </aside>

      {/* Mobile slide-over drawer — `fixed`, so it's harmless as a flex
          sibling of the aside/content regardless of where it sits in the
          tree (unlike the trigger bar below, which must NOT live here —
          see MobileTopBar's own comment for why). */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
            />
            <motion.aside
              key="drawer"
              role="dialog"
              aria-modal="true"
              aria-label={t("navigationMenu")}
              initial={{ x: rtl ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: rtl ? "100%" : "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="glass-panel fixed inset-y-0 start-0 z-50 flex w-72 flex-col md:hidden"
            >
              <div className="flex items-center justify-between px-4 py-4">
                <Link href="/" className="text-lg font-bold text-white" onClick={() => setMobileOpen(false)}>
                  SportsWorld
                </Link>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label={t("closeMenu")}
                  className="rounded-md p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Rendered separately, INSIDE the content column in app/layout.tsx (above
// {children}), not as a sibling of <AppSidebar/> in the outer flex row —
// the outer row's only two "real" columns are the desktop aside and the
// content; a horizontal bar meant to stack above the content vertically
// would otherwise become a third row-level flex item and get stretched to
// the full row height by the parent's default `align-items: stretch`
// (a real bug hit while building this: it rendered as a tall column
// instead of a slim top bar).
export function MobileTopBar() {
  const { setMobileOpen } = useSidebar();
  const { t } = useLang();
  return (
    <div className="dark sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-neutral-950/90 px-4 py-3 backdrop-blur md:hidden">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label={t("openMenu")}
        className="rounded-md p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link href="/" className="text-lg font-bold text-white">
        SportsWorld
      </Link>
      <div className="flex items-center gap-2">
        <LangToggle />
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex items-center rounded-full border border-white/14 bg-white/5 p-1.5 text-white/85 backdrop-blur-md transition hover:text-white"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default AppSidebar;
