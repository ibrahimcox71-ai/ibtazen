"use client";

import { AnimatePresence, motion } from "../motion";
import { cn, focusRing } from "@ibtatech/utils";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "./button-link";
import { ThemeToggle } from "./theme-toggle";

export interface NavLink {
  href: string;
  label: string;
}

interface HeaderProps {
  nav: ReadonlyArray<NavLink>;
  ctaLabel?: string;
  ctaHref?: string;
  /**
   * Uploaded brand logo. Absent means the text wordmark is rendered — the
   * site keeps working before an operator has ever uploaded anything.
   */
  logo?: { src: string; alt?: string } | null;
}

/**
 * Site header: solidifies on scroll, animates the active underline via layout
 * animation, and opens a mobile sheet. The sheet closes through event handlers
 * (link click, toggle, Escape, viewport widening past lg) — not effects — and
 * while it is open focus lives inside the header: it lands on the first sheet
 * link, Tab cycles within the header, and closing hands it back to the toggle.
 */
export function Header({
  nav,
  ctaLabel = "Book a Free Discovery Call",
  ctaHref = "/book",
  logo,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  // Sheet opened at least once — used to hand focus back to the toggle.
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // While the sheet is open: Escape closes it, body scroll locks, widening
  // past lg closes it (so the lock never sticks on desktop), and Tab is
  // trapped inside the header — the sheet is an inline expansion, so without
  // a trap the page behind it would stay in the tab order.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const root = headerRef.current;
      if (!root) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ).filter((el) => el.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
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
  // it closes, so keyboard users are never stranded behind the menu.
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      sheetRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      // The toggle is `lg:hidden` — after a viewport-widen close it is gone,
      // and focus (inside the unmounting sheet) falls back to the document.
      const toggle = toggleRef.current;
      if (toggle && toggle.offsetParent !== null) toggle.focus();
    }
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <motion.header
      ref={headerRef}
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "top-0 sticky z-40 transition-[background-color,box-shadow] duration-200",
        scrolled
          ? "backdrop-blur-md border-b border-border-subtle bg-surface/85 shadow-xs"
          : "border-b border-transparent bg-surface",
      )}
    >
      <div className="h-16 max-w-7xl gap-4 px-4 sm:px-6 lg:px-8 mx-auto flex w-full items-center justify-between">
        <Link
          href="/"
          aria-label={logo ? (logo.alt ?? "Ibtatech") : undefined}
          className={cn(
            "min-h-11 text-lg font-semibold tracking-tight flex items-center rounded-md font-display text-text",
            focusRing,
          )}
        >
          {logo ? (
            <Image
              src={logo.src}
              alt={logo.alt ?? "Ibtatech"}
              width={160}
              height={32}
              priority
              unoptimized
              className="h-8 max-w-48 w-auto"
            />
          ) : (
            "Ibtatech"
          )}
        </Link>

        <nav aria-label="Primary" className="gap-1 lg:flex hidden items-center">
          {nav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "min-h-11 px-3 py-2 text-sm font-medium relative rounded-md transition-colors",
                isActive(link.href) ? "text-text" : "text-text-secondary hover:text-text",
                focusRing,
              )}
            >
              {link.label}
              {isActive(link.href) && (
                <motion.span
                  layoutId="header-active-nav"
                  className="inset-x-3 -bottom-0.5 h-0.5 absolute rounded-full bg-accent"
                />
              )}
            </Link>
          ))}
        </nav>

        <div className="gap-2 flex items-center">
          <ThemeToggle />
          {/* size="md" = 44px: the header CTA is a primary tap target at every width. */}
          <ButtonLink href={ctaHref} size="md">
            <span className="sm:hidden">Book a call</span>
            <span className="sm:inline hidden">{ctaLabel}</span>
          </ButtonLink>
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={open ? "mobile-nav" : undefined}
          aria-label={open ? "Close menu" : "Open menu"}
          className={cn(
            "size-11 lg:hidden flex items-center justify-center rounded-md text-text",
            focusRing,
          )}
        >
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            ref={sheetRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="px-4 pb-6 pt-2 lg:hidden border-t border-border-subtle bg-surface"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {nav.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "min-h-11 px-3 text-base font-medium flex items-center rounded-md",
                    isActive(link.href) ? "text-accent" : "text-text",
                    focusRing,
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <ButtonLink
              href={ctaHref}
              size="lg"
              className="mt-4 w-full"
              onClick={() => setOpen(false)}
            >
              {ctaLabel}
            </ButtonLink>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
