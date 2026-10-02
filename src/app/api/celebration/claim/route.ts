import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/celebration/db";
import { claimSchema, dbErrorResponse, readJson } from "@/lib/celebration/validation";
import type { ClaimResult } from "@/lib/celebration/types";

/**
 * A guest signs up to bring an item. The availability check that matters
 * happens inside claim_food_item() under a row lock (and again in the
 * contributions capacity trigger), so two simultaneous requests for the
 * last slot can't both succeed — the loser gets a 409 with a kind message.
 */
export async function POST(request: Request) {
  const parsed = await readJson(request, claimSchema);
  if ("response" in parsed) return parsed.response;
  const { itemId, name, phone, email, quantity, note, acknowledged } = parsed.data;

  const { data, error } = await createPublicClient().rpc("claim_food_item", {
    p_item_id: itemId,
    p_name: name,
    p_phone: phone,
    p_email: email,
    p_quantity: quantity,
    p_note: note,
    p_acknowledged: acknowledged,
  });
  if (error) return dbErrorResponse(error);
  return NextResponse.json(data as ClaimResult, { status: 201 });
}
