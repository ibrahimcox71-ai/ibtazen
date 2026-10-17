"use client";

import { cn, focusRing } from "@ibtatech/utils";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "../motion";
import { useId } from "react";
import type { ReactNode } from "react";

export const Tabs = TabsPrimitive.Root;

interface TabsListProps {
  items: ReadonlyArray<{ value: string; label: string }>;
  className?: string;
}

/** Tab list with a sliding active indicator (layout animation, transform-only). */
export function TabsList({ items, className }: TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        "gap-1 p-1 inline-flex items-center rounded-lg border border-border-subtle bg-surface-sunken",
        className,
      )}
    >
      {items.map((item) => (
        <TabsPrimitive.Trigger
          key={item.value}
          value={item.value}
          className={cn(
            "px-3.5 py-2 text-sm font-medium relative rounded-md text-text-secondary transition-colors",
            "data-[state=active]:text-text data-[state=inactive]:hover:text-text",
            focusRing,
          )}
        >
          {item.label}
        </TabsPrimitive.Trigger>
      ))}
    </TabsPrimitive.List>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <TabsPrimitive.Content value={value} className={cn("focus:outline-none", className)}>
      <motion.div
        key={id + value}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </TabsPrimitive.Content>
  );
}
