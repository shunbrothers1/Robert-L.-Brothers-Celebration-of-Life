import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/celebration/db";
import { dbErrorResponse, readJson, updateContributionSchema } from "@/lib/celebration/validation";

// A guest's private manage link. The token is the only credential: the
// database stores just its SHA-256 hash, and each function below touches
// only the one sign-up whose hash matches.

type Params = { params: Promise<{ token: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { token } = await params;
  const parsed = await readJson(request, updateContributionSchema);
  if ("response" in parsed) return parsed.response;

  const { data, error } = await createPublicClient().rpc("update_contribution_by_token", {
    p_token: token,
    p_quantity: parsed.data.quantity,
    p_note: parsed.data.note,
  });
  if (error) return dbErrorResponse(error);
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { token } = await params;
  const { data, error } = await createPublicClient().rpc("cancel_contribution_by_token", { p_token: token });
  if (error) return dbErrorResponse(error);
  return NextResponse.json(data);
}
