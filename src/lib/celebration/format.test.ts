import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatDeadline,
  formatLifeDates,
  formatLongDate,
  itemProgress,
  singularize,
  slugify,
} from "./format";
import { friendlyError, errorCode } from "./errors";
import { attachClaims, computeOverview, csvCell } from "./stats";
import type { Contribution, FoodItem, SuggestedItem } from "./types";

describe("singularize / formatAmount", () => {
  it("singularizes common units", () => {
    expect(singularize("large trays")).toBe("large tray");
    expect(singularize("cases")).toBe("case");
    expect(singularize("boxes")).toBe("box");
    expect(singularize("packs of 100")).toBe("pack of 100");
    expect(singularize("dozen")).toBe("dozen");
    expect(singularize("2-liter bottles")).toBe("2-liter bottle");
  });

  it("formats amounts", () => {
    expect(formatAmount(1, "large trays")).toBe("1 large tray");
    expect(formatAmount(2, "large trays")).toBe("2 large trays");
    expect(formatAmount(3, "")).toBe("3");
  });
});

describe("itemProgress", () => {
  it("reports still needed", () => {
    expect(itemProgress({ quantity_needed: 3, quantity_claimed: 0, manually_covered: false })).toMatchObject({
      remaining: 3,
      status: "needed",
      percent: 0,
    });
  });
  it("reports almost covered at half or more", () => {
    expect(itemProgress({ quantity_needed: 2, quantity_claimed: 1, manually_covered: false })).toMatchObject({
      remaining: 1,
      status: "almost",
      percent: 50,
    });
  });
  it("reports covered when fully claimed", () => {
    expect(itemProgress({ quantity_needed: 2, quantity_claimed: 2, manually_covered: false })).toMatchObject({
      remaining: 0,
      status: "covered",
    });
  });
  it("treats manually covered items as covered with nothing remaining", () => {
    expect(itemProgress({ quantity_needed: 4, quantity_claimed: 1, manually_covered: true })).toMatchObject({
      remaining: 0,
      status: "covered",
      percent: 100,
    });
  });
});

describe("dates and names", () => {
  it("formats date-only values without a timezone shift", () => {
    expect(formatLongDate("2026-10-10")).toBe("Saturday, October 10, 2026");
    expect(formatDeadline("2026-10-09")).toBe("Friday, October 9");
    expect(formatLongDate(null)).toBeNull();
  });
  it("formats life dates", () => {
    expect(formatLifeDates("1938", "2026")).toBe("1938 – 2026");
    expect(formatLifeDates(null, "2026")).toBe("2026");
    expect(formatLifeDates(null, null)).toBeNull();
  });
  it("slugifies names", () => {
    expect(slugify("James Robert Brown")).toBe("james-robert-brown");
    expect(slugify("  Zoë  O'Neil! ")).toBe("zoe-o-neil");
  });
});

describe("friendlyError", () => {
  it("maps database codes to plain English", () => {
    expect(errorCode({ message: "ITEM_FULL", hint: "1" })).toBe("ITEM_FULL");
    expect(friendlyError({ message: "ITEM_FULL", hint: "1" })).toMatch(/only 1 more is still needed/);
    expect(friendlyError({ message: "ITEM_FULL", hint: "0" })).toMatch(/last one/);
    expect(friendlyError({ message: "SIGNUPS_CLOSED" })).toMatch(/closed/);
    expect(friendlyError({ message: "BELOW_CLAIMED", hint: "2" })).toMatch(/2 already signed up/);
    expect(friendlyError({ message: "duplicate key", code: "23505" })).toMatch(/already exists/);
    expect(friendlyError({ message: "boom" })).toMatch(/Something went wrong/);
  });
});

describe("computeOverview", () => {
  const item = (id: string, needed: number, extra: Partial<FoodItem> = {}): FoodItem => ({
    id,
    event_id: "e",
    category_id: "c",
    name: id,
    description: null,
    quantity_needed: needed,
    unit: "trays",
    is_priority: false,
    is_hidden: false,
    manually_covered: false,
    sort_order: 0,
    ...extra,
  });
  const contribution = (food_item_id: string, quantity: number, name: string, status: Contribution["status"] = "confirmed") =>
    ({ id: `${food_item_id}-${name}-${status}`, food_item_id, quantity, contributor_name: name, status }) as Contribution;

  it("counts units, covered items and distinct contributors", () => {
    const items = attachClaims(
      [item("mac", 3), item("greens", 2), item("ice", 4, { manually_covered: true }), item("secret", 5, { is_hidden: true })],
      [
        contribution("mac", 2, "Tasha Brown"),
        contribution("greens", 2, "tasha  brown"),
        contribution("greens", 1, "Marcus", "cancelled"),
      ]
    );
    const stats = computeOverview(items, [{ status: "pending" } as SuggestedItem, { status: "declined" } as SuggestedItem]);
    expect(stats.totalItemsNeeded).toBe(9);
    expect(stats.totalClaimed).toBe(4);
    expect(stats.itemsCovered).toBe(2);
    expect(stats.itemsStillNeeded).toBe(1);
    expect(stats.pendingSuggestions).toBe(1);
    expect(stats.totalContributors).toBe(1);
    // mac 2/3 + greens 2/2 + ice 4/4 (manually covered) = 8/9
    expect(stats.percentCovered).toBe(89);
  });
});

describe("csvCell", () => {
  it("quotes and defuses formulas", () => {
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(null)).toBe("");
  });
});
