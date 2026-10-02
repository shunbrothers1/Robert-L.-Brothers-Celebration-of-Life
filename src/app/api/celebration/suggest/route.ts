import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/celebration/db";
import { dbErrorResponse, readJson, suggestSchema } from "@/lib/celebration/validation";

/**
 * "Bring something else" — stored as Pending Family Approval, never as a
 * confirmed contribution, until an admin approves it from /admin.
 */
export async function POST(request: Request) {
  const parsed = await readJson(request, suggestSchema);
  if ("response" in parsed) return parsed.response;
  const { slug, name, phone, email, itemName, quantityText, note } = parsed.data;

  const { data, error } = await createPublicClient().rpc("submit_suggested_item", {
    p_slug: slug,
    p_name: name,
    p_phone: phone,
    p_email: email,
    p_item_name: itemName,
    p_quantity_text: quantityText,
    p_note: note,
  });
  if (error) return dbErrorResponse(error);
  return NextResponse.json(data, { status: 201 });
}
