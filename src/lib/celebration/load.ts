import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSessionClient, createPublicClient } from "@/lib/celebration/db";
import type { ManagedContribution, PublicEvent } from "@/lib/celebration/types";

/**
 * Loads an event's public page data. Guests get it through the anon key;
 * if the event isn't published yet, a signed-in admin still gets it (the
 * function itself checks admin_users), so the family can preview before
 * sharing the link. Cached per request so the page and its metadata share
 * one round-trip.
 */
export const loadPublicEvent = cache(async (slug: string): Promise<{ data: PublicEvent; preview: boolean } | null> => {
  const publicClient = createPublicClient();
  const { data, error } = await publicClient.rpc("get_public_event", { p_slug: slug });
  if (error) throw new Error(`get_public_event failed: ${error.message}`);
  if (data) return { data: await withArtwork(publicClient, data as PublicEvent), preview: false };

  const session = await createAdminSessionClient();
  const { data: adminData } = await session.rpc("get_public_event", { p_slug: slug });
  return adminData ? { data: await withArtwork(session, adminData as PublicEvent), preview: true } : null;
});

/**
 * Adds the optional background artwork URL. It lives in a column added by
 * migration 0002 and is read straight from memorial_events (guests may read
 * published events); before that migration runs, the column doesn't exist
 * and the page simply uses the built-in artwork.
 */
async function withArtwork(client: SupabaseClient, data: PublicEvent): Promise<PublicEvent> {
  if (data.event.background_image_url !== undefined) return data;
  const { data: row, error } = await client
    .from("memorial_events")
    .select("background_image_url")
    .eq("id", data.event.id)
    .maybeSingle();
  const url = error ? null : ((row as { background_image_url?: string | null } | null)?.background_image_url ?? null);
  return { ...data, event: { ...data.event, background_image_url: url } };
}

export const loadContributionByToken = cache(async (token: string): Promise<ManagedContribution | null> => {
  const { data, error } = await createPublicClient().rpc("get_contribution_by_token", { p_token: token });
  if (error) throw new Error(`get_contribution_by_token failed: ${error.message}`);
  return (data as ManagedContribution | null) ?? null;
});
