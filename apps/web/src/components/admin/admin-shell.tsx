"use client";

import { cn, focusRing } from "@ibtatech/utils";
import {
  BookOpen,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Newspaper,
  ContactRound,
  Receipt,
  Settings,
  UserCog,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ThemeToggle } from "@ibtatech/ui";
import { canManageSiteSettings, canManageUsers } from "@ibtatech/leads";
import { logoutAction } from "@/lib/admin/actions";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: ListChecks },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/admin/case-studies", label: "Case Studies", icon: BookOpen },
  { href: "/admin/blog", label: "Blog", icon: Newspaper },
  { href: "/admin/team", label: "People", icon: ContactRound },
  { href: "/admin/users", label: "Users", icon: UserCog },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

/** Submit button that reflects the server action's pending state. */
function SignOutButton({ className, withLabel }: { className: string; withLabel?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label={withLabel ? undefined : "Sign out"}
      className={className}
    >
      <LogOut aria-hidden className="size-4" />
      {withLabel && (pending ? "Signing out…" : "Sign out")}
    </button>
  );
}

export function AdminShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Track previous pathname so navigation closes the mobile sheet without
  // calling setState during the initial effect pass.
  const prevPathRef = useRef(pathname);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  // Sheet opened at least once — used to hand focus back to the toggle.
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // The sheet is a full-height overlay: closing it when the desktop layout
    // takes over keeps `inert` on <main> from ever sticking on wide screens.
    const mq = window.matchMedia("(min-width: 1024px)");
    const onViewport = () => {
      if (mq.matches) setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onViewport);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onViewport);
    };
  }, [open]);

  // Focus moves into the sheet when it opens and returns to the toggle when
  // it closes, so keyboard users are never stranded behind the overlay.
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      sheetRef.current?.querySelector<HTMLElement>("a")?.focus();
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      toggleRef.current?.focus();
    }
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Admin-only surfaces — each page repeats its own gate.
  const navItems = NAV.filter((item) => {
    if (item.href === "/admin/users") return canManageUsers(user.role);
    if (item.href === "/admin/settings") return canManageSiteSettings(user.role);
    return true;
  });

  const navList = (
    <nav aria-label="Admin" className="gap-1 flex flex-col">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "min-h-11 gap-3 px-3 text-sm font-medium flex items-center rounded-md transition-colors",
            isActive(href)
              ? "bg-accent-soft text-accent"
              : "text-text-secondary hover:bg-surface-sunken hover:text-text",
            focusRing,
          )}
        >
          <Icon aria-hidden className="size-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="lg:flex-row flex min-h-dvh flex-col bg-surface-sunken">
      <a
        href="#admin-main"
        className="focus:left-4 focus:top-4 focus:px-4 focus:py-2 sr-only focus:not-sr-only focus:fixed focus:z-50 focus:rounded-md focus:bg-surface-inverted focus:text-text-on-inverted"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside
        inert={open || undefined}
        className="top-0 w-60 lg:flex sticky hidden h-dvh shrink-0 flex-col border-r border-border-subtle bg-surface"
      >
        <div className="h-14 px-4 flex items-center border-b border-border-subtle">
          <Link
            href="/admin/dashboard"
            className={cn("text-base font-semibold font-display", focusRing)}
          >
            Ibtatech <span className="text-xs font-medium font-sans text-text-muted">CRM</span>
          </Link>
        </div>
        <div className="p-3 flex-1 overflow-y-auto">{navList}</div>
        <div className="p-3 border-t border-border-subtle">
          <div className="mb-2 px-1">
            <p className="text-sm font-medium truncate text-text">{user.name}</p>
            <p className="text-xs truncate text-text-muted">{user.email}</p>
          </div>
          <form action={logoutAction}>
            <SignOutButton
              withLabel
              className={cn(
                "min-h-11 gap-3 px-3 text-sm font-medium flex w-full items-center rounded-md text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text disabled:opacity-50",
                focusRing,
              )}
            />
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex flex-1 flex-col">
        {/* Compact top bar */}
        <header className="top-0 h-14 gap-3 px-4 backdrop-blur-md sm:px-6 sticky z-40 flex items-center justify-between border-b border-border-subtle bg-surface/90">
          <div className="min-w-0 gap-3 flex items-center">
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={open ? "admin-mobile-nav" : undefined}
              aria-label={open ? "Close menu" : "Open menu"}
              className={cn(
                "size-11 lg:hidden flex shrink-0 items-center justify-center rounded-md text-text",
                focusRing,
              )}
            >
              {open ? (
                <X aria-hidden className="size-5" />
              ) : (
                <Menu aria-hidden className="size-5" />
              )}
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate font-display">Ibtatech CRM</p>
              <p className="text-xs lg:hidden truncate text-text-muted">{user.email}</p>
            </div>
          </div>
          <div className="gap-2 flex items-center">
            <ThemeToggle />
            <span className="px-2.5 py-0.5 text-xs font-medium sm:inline-flex hidden rounded-full border border-border-default bg-surface-sunken text-text-secondary capitalize">
              {user.role}
            </span>
            <form action={logoutAction} className="lg:hidden">
              <SignOutButton
                className={cn(
                  "size-11 flex items-center justify-center rounded-md text-text-secondary hover:text-text disabled:opacity-50",
                  focusRing,
                )}
              />
            </form>
          </div>
        </header>

        {/* Mobile nav sheet — focus lands on its first link while it is open;
            the content behind it is inert so Tab cannot reach invisible controls. */}
        <div
          id="admin-mobile-nav"
          ref={sheetRef}
          className={cn(
            "inset-x-0 bottom-0 top-14 p-4 lg:hidden fixed z-30 overflow-y-auto border-t border-border-subtle bg-surface",
            open ? "block" : "hidden",
          )}
        >
          {navList}
          <div className="mt-4 pt-3 border-t border-border-subtle">
            <p className="px-1 text-sm font-medium text-text">{user.name}</p>
            <p className="px-1 text-xs text-text-muted">{user.email}</p>
          </div>
        </div>

        <main
          id="admin-main"
          tabIndex={-1}
          inert={open || undefined}
          className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 flex-1 focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
