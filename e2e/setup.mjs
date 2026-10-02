// Prepares a LOCAL or THROWAWAY Supabase project for the end-to-end tests:
// creates the sample event (/celebration/sample) with the starter menu, an
// approved admin, and a signed-up-but-not-approved account. Never run this
// against production. Needs NEXT_PUBLIC_SUPABASE_URL (or .env.local) and
// CELEBRATION_TEST_SERVICE_ROLE_KEY.
import { createClient } from "@supabase/supabase-js";
import { ADMIN_EMAIL, OUTSIDER_EMAIL, PASSWORD, supabasePublicEnv } from "./common.mjs";

const { url } = supabasePublicEnv();
const serviceKey = process.env.CELEBRATION_TEST_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and CELEBRATION_TEST_SERVICE_ROLE_KEY.");
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const ids = {};
for (const email of [ADMIN_EMAIL, OUTSIDER_EMAIL]) {
  const { data, error } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error && !/already/i.test(error.message)) throw error;
  ids[email] = data?.user?.id ?? (await db.auth.admin.listUsers()).data.users.find((u) => u.email === email).id;
}
await db.from("admin_users").upsert({ user_id: ids[ADMIN_EMAIL], email: ADMIN_EMAIL });

const { data: existing } = await db.from("memorial_events").select("id").eq("slug", "sample").maybeSingle();
if (existing) await db.from("memorial_events").delete().eq("id", existing.id);
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const { data: event, error } = await db
  .from("memorial_events")
  .insert({
    slug: "sample",
    person_name: "James Robert Brown",
    birth_date_text: "1938",
    passing_date_text: "2026",
    event_date: day(10),
    service_info: "Homegoing service at 11:00 AM, Greater Hope Baptist Church",
    repast_time_text: "Immediately following the service, about 1:00 PM",
    repast_location_name: "Greater Hope Fellowship Hall",
    repast_address: "123 Main Street, Atlanta, GA 30303",
    signup_deadline: day(7),
    is_published: true,
  })
  .select("id")
  .single();
if (error) throw error;
const seeded = await db.rpc("seed_default_menu", { p_event_id: event.id });
if (seeded.error) throw seeded.error;
await db
  .from("food_items")
  .update({ is_priority: true })
  .eq("event_id", event.id)
  .in("name", ["Fried Chicken", "Cases of Bottled Water", "Ice"]);
// Monetary gifts (migration 0003) — skipped quietly if not migrated yet.
const gifts = await db
  .from("memorial_events")
  .update({
    giving_enabled: true,
    giving_methods: [
      { type: "cashapp", value: "$BrothersFamily", label: "Brothers Family" },
      { type: "zelle", value: "family@example.com" },
    ],
  })
  .eq("id", event.id);
console.log(gifts.error ? "(monetary gifts not set up: migration 0003 not applied)" : "monetary gifts enabled");
console.log("E2E setup done: /celebration/sample, admin", ADMIN_EMAIL, "outsider", OUTSIDER_EMAIL);
