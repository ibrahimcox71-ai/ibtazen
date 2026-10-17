"use client";

import { cn, focusRing } from "@ibtatech/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { motion } from "../motion";

/**
 * Accessible dialog on Radix primitives, with GPU-safe entrance animation.
 * Radix owns focus trapping, escape, scroll locking and ARIA. Exit is instant:
 * Radix unmounts the portal on close, so only the entrance can animate (a real
 * exit needs AnimatePresence + open state threaded through the Root).
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

interface DialogContentProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Extra footer content (actions). */
  footer?: ReactNode;
}

export function DialogContent({
  title,
  description,
  children,
  className,
  footer,
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay asChild>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="inset-0 fixed z-50 bg-overlay"
        />
      </DialogPrimitive.Overlay>
      <DialogPrimitive.Content asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "max-w-lg fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border-default bg-surface shadow-lg focus:outline-none",
            className,
          )}
        >
          <div className="gap-4 p-6 pb-0 flex items-start justify-between">
            <div className="gap-1 flex flex-col">
              <DialogPrimitive.Title className="text-title">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-body text-text-secondary">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Close dialog"
              className={cn(
                "-m-2 p-2 rounded-md text-text-muted transition-colors hover:bg-surface-sunken hover:text-text",
                focusRing,
              )}
            >
              <X aria-hidden className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">{children}</div>
          {footer && (
            <div className="gap-3 p-4 flex items-center justify-end border-t border-border-subtle">
              {footer}
            </div>
          )}
        </motion.div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
