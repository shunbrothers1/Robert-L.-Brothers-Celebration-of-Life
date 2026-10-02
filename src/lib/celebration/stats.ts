import { itemProgress } from "@/lib/celebration/format";
import type { Contribution, FoodItem, SuggestedItem } from "@/lib/celebration/types";

export type ItemWithClaims = FoodItem & { quantity_claimed: number; contributions: Contribution[] };

/** Attaches each item's active (non-cancelled) contributions and claimed total. */
export function attachClaims(items: FoodItem[], contributions: Contribution[]): ItemWithClaims[] {
  const byItem = new Map<string, Contribution[]>();
  for (const c of contributions) {
    if (c.status === "cancelled") continue;
    const list = byItem.get(c.food_item_id) ?? [];
    list.push(c);
    byItem.set(c.food_item_id, list);
  }
  return items.map((item) => {
    const list = byItem.get(item.id) ?? [];
    return { ...item, contributions: list, quantity_claimed: list.reduce((sum, c) => sum + c.quantity, 0) };
  });
}

export type OverviewStats = {
  totalItemsNeeded: number;
  totalClaimed: number;
  itemsStillNeeded: number;
  itemsCovered: number;
  pendingSuggestions: number;
  totalContributors: number;
  percentCovered: number;
};

/**
 * Overview numbers for the admin dashboard. Hidden items are left out (the
 * public can't see them, so they aren't "needed" from guests). Quantities
 * are counted per unit: 3 trays needed with 2 claimed counts as 2 of 3,
 * and an item the family marked covered counts as fully covered.
 */
export function computeOverview(items: ItemWithClaims[], suggestions: SuggestedItem[]): OverviewStats {
  const visible = items.filter((i) => !i.is_hidden);
  let totalNeeded = 0;
  let coveredUnits = 0;
  let totalClaimed = 0;
  let stillNeeded = 0;
  let covered = 0;
  for (const item of visible) {
    const p = itemProgress(item);
    totalNeeded += p.needed;
    totalClaimed += item.quantity_claimed;
    coveredUnits += p.status === "covered" ? p.needed : Math.min(p.claimed, p.needed);
    if (p.status === "covered") covered += 1;
    else stillNeeded += 1;
  }
  const contributors = new Set<string>();
  for (const item of items) {
    for (const c of item.contributions) contributors.add(c.contributor_name.trim().toLowerCase().replace(/\s+/g, " "));
  }
  return {
    totalItemsNeeded: totalNeeded,
    totalClaimed,
    itemsStillNeeded: stillNeeded,
    itemsCovered: covered,
    pendingSuggestions: suggestions.filter((s) => s.status === "pending").length,
    totalContributors: contributors.size,
    percentCovered: totalNeeded === 0 ? 0 : Math.round((coveredUnits / totalNeeded) * 100),
  };
}

/** Escapes a value for a CSV cell (RFC 4180), and defuses spreadsheet formulas. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
