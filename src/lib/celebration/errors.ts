// The database functions raise short, stable codes (ITEM_FULL,
// SIGNUPS_CLOSED, ...) — see 0001_initial_schema.sql. This turns them
// into gentle, plain-English messages for guests and admins.

export type DbError = { message?: string; hint?: string | null; code?: string } | null | undefined;

export function errorCode(error: DbError): string {
  const message = error?.message ?? "";
  const match = /^[A-Z_]+$/.exec(message.trim());
  if (match) return match[0];
  if (error?.code === "42501") return "NOT_AUTHORIZED";
  if (error?.code === "23505") return "DUPLICATE";
  if (error?.code === "23503") return "IN_USE";
  return "UNKNOWN";
}

export function friendlyError(error: DbError): string {
  const code = errorCode(error);
  const hint = error?.hint ? Number(error.hint) : NaN;
  switch (code) {
    case "ITEM_FULL":
      if (Number.isFinite(hint) && hint > 0) {
        return `Someone just signed up for part of this item — only ${hint} more ${hint === 1 ? "is" : "are"} still needed. Please lower the amount and try again.`;
      }
      return "Someone just signed up for the last one of this item, so it's now covered. Thank you — please choose another item that's still needed.";
    case "ITEM_COVERED":
      return "This item is already covered — thank you! Please choose another item that's still needed.";
    case "SIGNUPS_CLOSED":
      return "Sign-ups are closed for this event. Please contact the family directly if you'd still like to help.";
    case "ACK_REQUIRED":
      return "Please check the box to confirm you'll bring this item.";
    case "SUGGESTIONS_OFF":
      return "The family isn't taking suggestions for other items right now.";
    case "NOT_EDITABLE":
      return "This sign-up can't be changed anymore. Please contact the family directly.";
    case "NOT_FOUND":
      return "We couldn't find that. It may have been removed — please refresh the page.";
    case "BELOW_CLAIMED":
      return Number.isFinite(hint)
        ? `${hint} already signed up for this item. Cancel or move those sign-ups before lowering the amount below ${hint}.`
        : "People have already signed up for more than that. Cancel or move sign-ups first.";
    case "INVALID_INPUT":
      if (error?.hint === "name") return "Please enter your name.";
      if (error?.hint === "item") return "Please tell us what you'd like to bring.";
      if (error?.hint === "too_long") return "One of the answers is too long — please shorten it.";
      return "Please check your answers and try again.";
    case "NO_ACCOUNT":
      return "No account exists with that email yet. Create it first in Supabase (Authentication → Add user), then add it here.";
    case "NOT_AUTHORIZED":
      return "You don't have permission to do that.";
    case "DUPLICATE":
      return "Something with that name already exists here. Please use a different name.";
    case "IN_USE":
      return "That's still in use (for example, a category that still has items). Move or remove those first.";
    default:
      return "Something went wrong. Please try again in a moment.";
  }
}
