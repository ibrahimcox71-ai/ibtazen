/**
 * Booking configuration — reads provider settings from the environment.
 * When BOOKING_URL is absent the site must show an honest fallback instead
 * of pretending scheduling works.
 */

export type BookingProvider = "cal.com" | "calendly";

export interface BookingConfig {
  configured: boolean;
  provider: BookingProvider | null;
  url: string | null;
}

export function getBookingConfig(): BookingConfig {
  const url = process.env.BOOKING_URL?.trim() || null;
  const rawProvider = process.env.BOOKING_PROVIDER?.trim().toLowerCase();
  const provider =
    rawProvider === "cal.com" || rawProvider === "calendly"
      ? (rawProvider as BookingProvider)
      : null;

  if (!url || !/^https:\/\/[^\s]+$/.test(url)) {
    return { configured: false, provider: null, url: null };
  }
  return { configured: true, provider: provider ?? "cal.com", url };
}
