import { Code, Mail, Megaphone, Smartphone, type LucideIcon } from "lucide-react";
import type { ServiceSlug } from "@ibtatech/types";

/**
 * Decorative glyphs keyed to the service config. Icons are always aria-hidden —
 * the visible title next to them is the accessible name — and every glyph is a
 * neutral concept, never a brand mark. One map so the homepage pillars and the
 * services index can never drift apart.
 */
export const SERVICE_ICONS: Record<ServiceSlug, LucideIcon> = {
  "web-development": Code,
  "mobile-app-development": Smartphone,
  "email-marketing": Mail,
  "paid-advertising": Megaphone,
};
