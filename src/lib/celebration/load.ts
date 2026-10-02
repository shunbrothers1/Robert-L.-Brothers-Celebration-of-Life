import { cache } from "react";
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
  const { data, error } = await createPublicClient().rpc("get_public_event", { p_slug: slug });
  if (error) throw new Error(`get_public_event failed: ${error.message}`);
  if (data) return { data: data as PublicEvent, preview: false };

  const session = await createAdminSessionClient();
  const { data: adminData } = await session.rpc("get_public_event", { p_slug: slug });
  return adminData ? { data: adminData as PublicEvent, preview: true } : null;
});

export const loadContributionByToken = cache(async (token: string): Promise<ManagedContribution | null> => {
  const { data, error } = await createPublicClient().rpc("get_contribution_by_token", { p_token: token });
  if (error) throw new Error(`get_contribution_by_token failed: ${error.message}`);
  return (data as ManagedContribution | null) ?? null;
});
