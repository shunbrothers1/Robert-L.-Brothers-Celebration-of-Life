import { getAdminContext } from "@/lib/celebration/db";
import { loadEventBundle } from "@/lib/celebration/admin-data";
import { csvCell } from "@/lib/celebration/stats";

/** Admin-only CSV of every sign-up, including contact details. */
export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) return new Response("Unauthorized", { status: 401 });

  const { eventId } = await params;
  const bundle = await loadEventBundle(eventId);
  if (!bundle) return new Response("Not found", { status: 404 });
  const { event, categories, items, contributions } = bundle;
  const itemById = new Map(items.map((i) => [i.id, i]));
  const categoryById = new Map(categories.map((c) => [c.id, c.name]));

  const header = ["Category", "Item", "Name", "Phone", "Email", "Quantity", "Unit", "Amount detail", "Notes", "Signed up", "Status"];
  const rows = contributions.map((c) => {
    const item = itemById.get(c.food_item_id);
    return [
      item ? categoryById.get(item.category_id) : "",
      item?.name,
      c.contributor_name,
      c.phone,
      c.email,
      c.quantity,
      item?.unit,
      c.amount_detail,
      c.note,
      new Date(c.created_at).toISOString(),
      c.status,
    ];
  });
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

  return new Response("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${event.slug}-contributors.csv"`,
      "cache-control": "no-store",
    },
  });
}
