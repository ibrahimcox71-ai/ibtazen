/**
 * Portal presentation helpers. Dates stored on documents are ISO calendar
 * strings (`YYYY-MM-DD`) — formatted as local dates so the displayed day
 * never shifts backwards across time zones.
 */
export function formatIsoDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    new Date(year, month - 1, day),
  );
}
