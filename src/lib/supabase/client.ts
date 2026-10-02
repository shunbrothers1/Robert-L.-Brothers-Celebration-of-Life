import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/** Browser-side client for client components (admin login and admin edits). */
export function createClient() {
  const { url, anonKey } = supabaseEnv();
  return createBrowserClient(url, anonKey);
}
