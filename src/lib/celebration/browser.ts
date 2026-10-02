import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Browser client for /admin client components. Writes run as the
 * signed-in admin, so RLS (is_memorial_admin()) and the capacity triggers
 * apply to every change — there's no privileged path from the browser.
 */
export function adminBrowserClient(): SupabaseClient {
  return createClient();
}
