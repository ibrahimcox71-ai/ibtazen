"use client";

import { cn, focusRing } from "@ibtatech/utils";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { motion } from "../motion";

export const Dropdown = DropdownPrimitive.Root;
export const DropdownTrigger = DropdownPrimitive.Trigger;

interface DropdownContentProps {
  children: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}

/**
 * Animated dropdown panel; Radix handles positioning, focus and keyboard nav.
 * Entrance only — Radix unmounts the portal on close, so there is no exit
 * animation (it would take AnimatePresence + open state threaded through Root).
 */
export function DropdownContent({ children, align = "end", className }: DropdownContentProps) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content asChild align={align} sideOffset={8}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: "var(--radix-dropdown-menu-content-transform-origin)" }}
          className={cn(
            "min-w-48 p-1 z-50 overflow-hidden rounded-lg border border-border-default bg-surface-raised shadow-md focus:outline-none",
            className,
          )}
        >
          {children}
        </motion.div>
      </DropdownPrimitive.Content>
    </DropdownPrimitive.Portal>
  );
}

const itemClass = cn(
  "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-2 text-sm text-text outline-none transition-colors data-[highlighted]:bg-surface-sunken",
  focusRing,
);

export function DropdownItem({
  children,
  onSelect,
  destructive = false,
}: {
  children: ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
}) {
  return (
    <DropdownPrimitive.Item
      onSelect={onSelect}
      className={cn(itemClass, destructive && "text-danger data-[highlighted]:bg-danger-soft")}
    >
      {children}
    </DropdownPrimitive.Item>
  );
}

export function DropdownSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-border-subtle" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownPrimitive.Label className="px-2.5 py-1.5 text-xs font-medium text-text-muted">
      {children}
    </DropdownPrimitive.Label>
  );
}
