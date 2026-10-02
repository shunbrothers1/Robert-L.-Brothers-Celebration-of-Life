import { cache } from "react";
import { createAdminSessionClient } from "@/lib/celebration/db";
import { attachClaims } from "@/lib/celebration/stats";
import type {
  Contribution,
  EventSettings,
  FoodCategory,
  FoodItem,
  MemorialEvent,
  SuggestedItem,
} from "@/lib/celebration/types";

/**
 * Everything an /admin/events/[eventId] page needs, read as the signed-in
 * admin through RLS. Cached per request so the tab layout and the page
 * share one set of queries.
 */
export const loadEventBundle = cache(async (eventId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return null;
  const supabase = await createAdminSessionClient();
  const [event, settings, categories, items, contributions, suggestions] = await Promise.all([
    supabase.from("memorial_events").select("*").eq("id", eventId).maybeSingle(),
    supabase.from("settings").select("*").eq("event_id", eventId).maybeSingle(),
    supabase.from("food_categories").select("*").eq("event_id", eventId).order("sort_order").order("name"),
    supabase.from("food_items").select("*").eq("event_id", eventId).order("sort_order").order("name"),
    supabase.from("contributions").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
    supabase.from("suggested_items").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
  ]);
  for (const r of [event, settings, categories, items, contributions, suggestions]) {
    if (r.error) throw new Error(`Loading event ${eventId} failed: ${r.error.message}`);
  }
  if (!event.data) return null;

  const allContributions = (contributions.data ?? []) as Contribution[];
  return {
    event: event.data as MemorialEvent,
    settings: settings.data as EventSettings,
    categories: (categories.data ?? []) as FoodCategory[],
    items: attachClaims((items.data ?? []) as FoodItem[], allContributions),
    contributions: allContributions,
    suggestions: (suggestions.data ?? []) as SuggestedItem[],
  };
});

export type EventBundle = NonNullable<Awaited<ReturnType<typeof loadEventBundle>>>;
