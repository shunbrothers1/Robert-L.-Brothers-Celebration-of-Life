// Pure display helpers for the Celebration of Life pages. No I/O, so
// they're shared by server and client components and unit-tested in
// format.test.ts.

export type ItemStatus = "needed" | "almost" | "covered";

export type ItemProgress = {
  needed: number;
  claimed: number;
  remaining: number;
  status: ItemStatus;
  /** 0–100, for the progress bar. */
  percent: number;
};

/** "trays" -> "tray", "boxes" -> "box", "dozen" -> "dozen". */
export function singularize(unit: string): string {
  const u = unit.trim();
  if (!u) return u;
  // Only the last word changes: "large trays" -> "large tray",
  // "packs of 100" -> "pack of 100".
  const ofIndex = u.toLowerCase().indexOf(" of ");
  if (ofIndex > 0) return singularize(u.slice(0, ofIndex)) + u.slice(ofIndex);
  const lower = u.toLowerCase();
  if (/(ches|shes|xes|sses)$/.test(lower)) return u.slice(0, -2);
  if (/ies$/.test(lower) && lower.length > 4) return u.slice(0, -3) + (u.endsWith("IES") ? "Y" : "y");
  if (/[^s]s$/.test(lower)) return u.slice(0, -1);
  return u;
}

/** "1 large tray", "2 large trays", or just "2" when there's no unit. */
export function formatAmount(quantity: number, unit: string): string {
  const u = unit.trim();
  if (!u) return String(quantity);
  return `${quantity} ${quantity === 1 ? singularize(u) : u}`;
}

export function itemProgress(item: {
  quantity_needed: number;
  quantity_claimed: number;
  manually_covered: boolean;
}): ItemProgress {
  const needed = Math.max(0, item.quantity_needed);
  const claimed = Math.max(0, item.quantity_claimed);
  const remaining = Math.max(0, needed - claimed);
  const covered = item.manually_covered || remaining === 0;
  const percent = covered ? 100 : needed === 0 ? 0 : Math.round((claimed / needed) * 100);
  let status: ItemStatus = "needed";
  if (covered) status = "covered";
  else if (claimed > 0 && claimed / needed >= 0.5) status = "almost";
  return { needed, claimed, remaining: covered ? 0 : remaining, status, percent };
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  needed: "Still Needed",
  almost: "Almost Covered",
  covered: "Covered",
};

/** Parses a Postgres `date` ("2026-10-10") as a calendar date, with no timezone shift. */
export function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "Saturday, October 10, 2026" */
export function formatLongDate(value: string | null | undefined): string | null {
  const d = value ? parseDateOnly(value) : null;
  if (!d) return null;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/** "Friday, October 9" */
export function formatDeadline(value: string | null | undefined): string | null {
  const d = value ? parseDateOnly(value) : null;
  if (!d) return null;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/** "1938 – 2026", or whichever half exists. */
export function formatLifeDates(birth: string | null, passing: string | null): string | null {
  const b = birth?.trim();
  const p = passing?.trim();
  if (b && p) return `${b} – ${p}`;
  return b || p || null;
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function shareMessage(personName: string): string {
  return (
    `Our family is coordinating food and supplies for ${personName}'s Celebration of Life. ` +
    "If you would like to contribute something for the repast, please use the link below to see " +
    "what is still needed. Thank you for all of your love and support."
  );
}

/** "James Robert Brown" -> "james-robert-brown" */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
