import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeGivingMethods } from "@/lib/celebration/giving";
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
  if (data) return { data: await withExtras(publicClient, data as PublicEvent), preview: false };

  const session = await createAdminSessionClient();
  const { data: adminData } = await session.rpc("get_public_event", { p_slug: slug });
  return adminData ? { data: await withExtras(session, adminData as PublicEvent), preview: true } : null;
});

/**
 * Adds the optional extras that live in later migrations and are read
 * straight from memorial_events (guests may read published events):
 * background artwork (0002) and monetary gift options (0003). Each is
 * queried separately so a project that hasn't run one migration yet
 * still gets the other; a missing column just means "not set up".
 */
async function withExtras(client: SupabaseClient, data: PublicEvent): Promise<PublicEvent> {
  const id = data.event.id;
  const [art, giving] = await Promise.all([
    client.from("memorial_events").select("background_image_url").eq("id", id).maybeSingle(),
    client.from("memorial_events").select("giving_enabled, giving_title, giving_message, giving_methods").eq("id", id).maybeSingle(),
  ]);
  const artRow = art.error ? null : (art.data as { background_image_url?: string | null } | null);
  const g = giving.error
    ? null
    : (giving.data as {
        giving_enabled?: boolean;
        giving_title?: string | null;
        giving_message?: string | null;
        giving_methods?: unknown;
      } | null);
  return {
    ...data,
    event: {
      ...data.event,
      background_image_url: data.event.background_image_url ?? artRow?.background_image_url ?? null,
      giving: g
        ? {
            enabled: Boolean(g.giving_enabled),
            title: g.giving_title ?? null,
            message: g.giving_message ?? null,
            methods: normalizeGivingMethods(g.giving_methods),
          }
        : null,
    },
  };
}

export const loadContributionByToken = cache(async (token: string): Promise<ManagedContribution | null> => {
  const { data, error } = await createPublicClient().rpc("get_contribution_by_token", { p_token: token });
  if (error) throw new Error(`get_contribution_by_token failed: ${error.message}`);
  return (data as ManagedContribution | null) ?? null;
});
