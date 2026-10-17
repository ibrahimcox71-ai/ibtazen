/**
 * URL normalisation for lead input. Security: only http(s) survives —
 * javascript:, data:, and credential-embedded URLs are rejected outright.
 */

export function normaliseUrl(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  if (!url.hostname || url.hostname.includes("..") || url.username || url.password) {
    return undefined;
  }
  if (url.port === "80" || url.port === "443") url.port = "";
  url.hash = "";
  // Strip tracking params — audits don't need them, and they leak campaign data.
  for (const key of [...url.searchParams.keys()]) url.searchParams.delete(key);
  // Collapse a trailing slash on non-root paths.
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  const out = url.toString();
  // URL.toString() always keeps "/" for the root path; nothing else to trim.
  return out;
}
