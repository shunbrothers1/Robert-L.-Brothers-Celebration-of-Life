import { NextResponse } from "next/server";
import { z, type ZodSchema } from "zod";
import { errorCode, friendlyError, type DbError } from "@/lib/celebration/errors";

// First-pass validation for the guest API routes. The database functions
// re-validate everything (and own the availability check), so these exist
// to give a quick, friendly error before a round-trip — not as the guard.

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const claimSchema = z.object({
  itemId: z.string().uuid(),
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Please check the email address."),
  quantity: z.number().int().min(1).max(999),
  note: optionalText(500),
  acknowledged: z.literal(true, {
    errorMap: () => ({ message: "Please check the box to confirm you'll bring this item." }),
  }),
});

export const suggestSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  phone: optionalText(30),
  email: claimSchema.shape.email,
  itemName: z.string().trim().min(1, "Please tell us what you'd like to bring.").max(100),
  quantityText: optionalText(100),
  note: optionalText(500),
});

export const updateContributionSchema = z.object({
  quantity: z.number().int().min(1).max(999),
  note: optionalText(500),
});

export async function readJson<T>(request: Request, schema: ZodSchema<T>) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { response: errorResponse("Please check your answers and try again.", "INVALID_INPUT", 400) } as const;
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    const first = result.error.issues[0];
    const message =
      first && first.message && !first.message.startsWith("Expected") && !first.message.startsWith("Invalid")
        ? first.message
        : "Please check your answers and try again.";
    return { response: errorResponse(message, "INVALID_INPUT", 400) } as const;
  }
  return { data: result.data } as const;
}

export function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

/** Maps a database-function error to a friendly JSON response. */
export function dbErrorResponse(error: DbError) {
  const code = errorCode(error);
  if (code === "UNKNOWN") console.error("[celebration] unexpected database error", error);
  const status =
    code === "ITEM_FULL" || code === "ITEM_COVERED"
      ? 409
      : code === "NOT_FOUND"
        ? 404
        : code === "SIGNUPS_CLOSED" || code === "SUGGESTIONS_OFF" || code === "NOT_EDITABLE"
          ? 403
          : code === "UNKNOWN"
            ? 500
            : 400;
  return NextResponse.json({ error: friendlyError(error), code, remaining: error?.hint ?? null }, { status });
}
