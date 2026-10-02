/**
 * The project URL as Supabase expects it: "https://<ref>.supabase.co".
 * Supabase's dashboard also shows the REST endpoint
 * ("https://<ref>.supabase.co/rest/v1/"), which is easy to paste by
 * mistake — with that suffix every auth request 404s with "Invalid path
 * specified in request URL". Strip it, plus stray whitespace and slashes.
 */
export function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/(rest|auth|storage)\/v1$/i, "")
    .replace(/\/+$/, "");
}

/**
 * This project's own Supabase project. Fails loudly at first use if the
 * variables are missing, rather than sending requests to "undefined".
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — see .env.example.");
  }
  return { url: normalizeSupabaseUrl(url), anonKey: anonKey.trim() };
}
