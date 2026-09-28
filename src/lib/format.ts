const MYT = "Asia/Kuala_Lumpur";

export function formatRM(value: number | string | null | undefined, opts: { compact?: boolean } = {}) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  return `RM ${n.toLocaleString("en-MY", { maximumFractionDigits: opts.compact ? 0 : 2 })}`;
}

/** Dates are stored as plain YYYY-MM-DD; parse at noon UTC so no timezone shifts the day. */
export function parseDate(d: string) {
  return new Date(`${d}T12:00:00Z`);
}

export function formatDate(d: string, style: "short" | "long" = "short") {
  return parseDate(d).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: style === "long" ? "numeric" : undefined,
    weekday: style === "long" ? "short" : undefined,
    timeZone: "UTC",
  });
}

export function formatMonth(d: string) {
  return parseDate(d).toLocaleDateString("en-MY", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Today's date in Malaysia as YYYY-MM-DD. */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MYT }).format(new Date());
}

export function addDaysISO(iso: string, days: number) {
  const d = parseDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function durationLabel(days: number | null, nights: number | null) {
  if (!days) return null;
  return nights != null ? `${days}D${nights}N` : `${days} days`;
}

export function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function lines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}
