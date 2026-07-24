"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  Home,
  Menu,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { ReactNode } from "react";
import { LangToggle, useLang, type TKey } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useSidebar } from "@/lib/sidebar-state";
import { useActiveZone } from "@/lib/world-zone";
import { SPORT_ORDER, sportsTheme } from "@/theme/sportsTheme";

/**
 * AppShell — the persistent global navigation chrome (Phase 2).
 *
 * A fixed inline-start sidebar rail on desktop (collapsible to an icon rail)
 * and an off-canvas drawer on mobile, sharing one <NavContent>. Everything is
 * RTL-aware via CSS logical properties (start-*, ps-*, border-s/e) so the rail
 * moves to the right under Hebrew with no JS branching. Wraps every page,
 * including the Hero — the main region simply pads its inline-start by the
 * current rail width (a CSS var so the md-breakpoint padding can be dynamic).
 */

const RAIL_EXPANDED = "250px";
const RAIL_COLLAPSED = "76px";

// Utility (non-sport) nav — separate feature areas, each with a placeholder
// route until its own phase rebuilds it. Neutral (brand-accent) highlight, no
// per-item accent color, to visually distinguish them from the sport rows.
const UTILITY_NAV: { href: string; labelKey: TKey; icon: ReactNode }[] = [
  { href: "/ai-center", labelKey: "nav_ai_center", icon: <Sparkles size={20} strokeWidth={2.25} /> },
  { href: "/news", labelKey: "nav_news", icon: <Newspaper size={20} strokeWidth={2.25} /> },
  { href: "/transfers", labelKey: "nav_transfers", icon: <ArrowLeftRight size={20} strokeWidth={2.25} /> },
  { href: "/profile", labelKey: "nav_profile", icon: <User size={20} strokeWidth={2.25} /> },
  { href: "/settings", labelKey: "nav_settings", icon: <Settings size={20} strokeWidth={2.25} /> },
];

function NavContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useLang();
  const { me } = useAuth();
  const pathname = usePathname();
  const zone = useActiveZone();

  const primary = SPORT_ORDER.filter((k) => sportsTheme[k].group === "primary");
  const other = SPORT_ORDER.filter((k) => sportsTheme[k].group === "other");
  const homeActive = zone === "home" && pathname === "/";

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      {/* Brand */}
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-2 py-3"
      >
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-display text-[color:var(--brand-accent)] ring-1 ring-inset ring-white/10"
          style={{ background: "rgba(198,255,74,0.08)" }}
        >
          SW
        </span>
        {!collapsed && (
          <span className="font-display text-xl tracking-wide text-[color:var(--chalk)]">
            SportsWorld
          </span>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        <NavRow
          href="/"
          icon={<Home size={20} strokeWidth={2.25} />}
          label={t("home")}
          active={homeActive}
          accent="var(--brand-accent)"
          collapsed={collapsed}
          onNavigate={onNavigate}
        />

        {primary.map((key) => {
          const s = sportsTheme[key];
          return (
            <NavRow
              key={key}
              href={s.route}
              icon={<span className="text-lg leading-none">{s.icon}</span>}
              label={t(s.labelKey)}
              active={zone === key}
              accent={s.accent}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          );
        })}

        {/* Other sports group */}
        {!collapsed && (
          <p className="mt-4 px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--chalk-dim)]">
            {t("otherSports")}
          </p>
        )}
        {collapsed && <div className="my-2 h-px bg-white/10" />}
        {other.map((key) => {
          const s = sportsTheme[key];
          return (
            <NavRow
              key={key}
              href={s.route}
              icon={<span className="text-lg leading-none">{s.icon}</span>}
              label={t(s.labelKey)}
              active={zone === key}
              accent={s.accent}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          );
        })}

        {/* Utility nav */}
        <div className="my-3 h-px bg-white/10" />
        {UTILITY_NAV.map((item) => (
          <NavRow
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={t(item.labelKey)}
            active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            accent="var(--brand-accent)"
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Footer: signed-in user chip + language toggle (expanded only) */}
      <div className="flex flex-col gap-2 px-2 pt-2">
        {me && (
          <Link
            href="/profile"
            onClick={onNavigate}
            title={me.name}
            className={`flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-white/5 ${collapsed ? "justify-center" : ""}`}
          >
            {me.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatar_url} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[color:var(--chalk-dim)]">
                <User size={16} />
              </span>
            )}
            {!collapsed && (
              <span className="truncate text-sm font-medium text-[color:var(--chalk)]">{me.name}</span>
            )}
          </Link>
        )}
        {!collapsed && <LangToggle />}
      </div>
    </div>
  );
}

function NavRow({
  href,
  icon,
  label,
  active,
  accent,
  collapsed,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  accent: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "text-[color:var(--chalk)]"
          : "text-[color:var(--chalk-dim)] hover:text-[color:var(--chalk)] hover:bg-white/5"
      } ${collapsed ? "justify-center" : ""}`}
      style={active ? { background: `${accent}1f` } : undefined}
    >
      {/* Active accent bar on the inline-start edge */}
      {active && (
        <span
          className="absolute inset-y-1.5 start-0 w-1 rounded-full"
          style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
        />
      )}
      <span
        className="grid h-8 w-8 shrink-0 place-items-center"
        style={active ? { color: accent } : undefined}
      >
        {icon}
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const { t, lang } = useLang();
  const railWidth = collapsed ? RAIL_COLLAPSED : RAIL_EXPANDED;
  // Drawer slides in from the inline-start edge (right under RTL).
  const drawerHidden = lang === "he" ? "100%" : "-100%";

  return (
    <div style={{ ["--rail-w" as string]: railWidth }}>
      {/* Desktop rail */}
      <aside
        className="fixed inset-y-0 start-0 z-40 hidden border-e border-white/10 bg-[color:var(--pitch-deep)]/95 backdrop-blur-md transition-[width] duration-300 md:block"
        style={{ width: railWidth }}
      >
        <NavContent collapsed={collapsed} />
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-label={t("toggleSidebar")}
          className="absolute bottom-4 end-3 grid h-9 w-9 place-items-center rounded-lg text-[color:var(--chalk-dim)] transition-colors hover:bg-white/5 hover:text-[color:var(--chalk)]"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[color:var(--pitch-deep)]/95 px-4 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label={t("openMenu")}
          className="grid h-10 w-10 place-items-center rounded-lg text-[color:var(--chalk)] hover:bg-white/5"
        >
          <Menu size={22} />
        </button>
        <Link href="/" className="font-display text-lg tracking-wide text-[color:var(--chalk)]">
          SportsWorld
        </Link>
        <LangToggle />
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <motion.aside
              className="fixed inset-y-0 start-0 z-50 w-[280px] border-e border-white/10 bg-[color:var(--pitch-deep)] md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label={t("navigationMenu")}
              initial={{ x: drawerHidden }}
              animate={{ x: 0 }}
              exit={{ x: drawerHidden }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={t("closeMenu")}
                className="absolute end-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg text-[color:var(--chalk-dim)] hover:bg-white/5 hover:text-[color:var(--chalk)]"
              >
                <X size={18} />
              </button>
              <NavContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content — padded past the rail on desktop, past the top bar on mobile */}
      <div className="pt-14 transition-[padding] duration-300 md:pt-0 md:[padding-inline-start:var(--rail-w)]">
        {children}
      </div>
    </div>
  );
}
