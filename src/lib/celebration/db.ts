import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

// Untyped clients; row shapes come from src/lib/celebration/types.ts.

/**
 * Anonymous, cookie-less client for guest-facing server code. It uses the
 * public anon key, so it has exactly the access a guest's browser would:
 * the published menu plus the guest functions in 0001_initial_schema.sql.
 * No service-role key is involved anywhere in this app.
 */
export function createPublicClient(): SupabaseClient {
  const { url, anonKey } = supabaseEnv();
  return createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Session-bound client for /admin server components; reads go through RLS as the signed-in user. */
export async function createAdminSessionClient(): Promise<SupabaseClient> {
  return (await createSessionClient()) as unknown as SupabaseClient;
}

/**
 * Resolves the signed-in user and whether they're an approved Celebration
 * of Life admin (a row in admin_users). Pages use this to decide what to
 * render; RLS independently enforces the same rule on every query.
 */
export async function getAdminContext() {
  const supabase = await createAdminSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };
  const { data, error } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error) console.error("[celebration] admin lookup failed", error);
  return { supabase, user, isAdmin: Boolean(data) };
}
