import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration tests for 0001_initial_schema.sql against a real
// Supabase stack (local `supabase start` or a disposable test project —
// NEVER production: it creates users and events). Skipped unless these are
// set:
//   CELEBRATION_TEST_SUPABASE_URL, CELEBRATION_TEST_ANON_KEY,
//   CELEBRATION_TEST_SERVICE_ROLE_KEY
// The service-role key is used only here, to create throwaway test users.

const url = process.env.CELEBRATION_TEST_SUPABASE_URL;
const anonKey = process.env.CELEBRATION_TEST_ANON_KEY;
const serviceKey = process.env.CELEBRATION_TEST_SERVICE_ROLE_KEY;
const enabled = Boolean(url && anonKey && serviceKey);

const opts = { auth: { autoRefreshToken: false, persistSession: false } };
const run = Date.now().toString(36);

async function signedInClient(service: SupabaseClient, email: string): Promise<{ client: SupabaseClient; userId: string }> {
  const password = `pw-${run}-Aa1!`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient(url!, anonKey!, opts);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { client, userId: data.user.id };
}

describe.skipIf(!enabled)("celebration of life database", () => {
  let service: SupabaseClient;
  let anon: SupabaseClient;
  let admin: SupabaseClient;
  let outsider: SupabaseClient;
  let eventId: string;
  const slug = `itest-${run}`;
  const userIds: string[] = [];

  async function addItem(name: string, quantity: number, extra: Record<string, unknown> = {}) {
    const { data: cat } = await admin.from("food_categories").select("id").eq("event_id", eventId).eq("name", "Side Dishes").single();
    const { data, error } = await admin
      .from("food_items")
      .insert({ event_id: eventId, category_id: cat!.id, name, quantity_needed: quantity, unit: "large trays", ...extra })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  const claim = (itemId: string, quantity = 1, name = "Tasha Brown", client = anon) =>
    client.rpc("claim_food_item", {
      p_item_id: itemId,
      p_name: name,
      p_phone: "555-0100",
      p_email: "tasha@example.com",
      p_quantity: quantity,
      p_note: "Around 1 PM",
      p_acknowledged: true,
    });

  beforeAll(async () => {
    service = createClient(url!, serviceKey!, opts);
    anon = createClient(url!, anonKey!, opts);
    const a = await signedInClient(service, `admin-${run}@example.com`);
    const o = await signedInClient(service, `outsider-${run}@example.com`);
    admin = a.client;
    outsider = o.client;
    userIds.push(a.userId, o.userId);
    const { error } = await service.from("admin_users").insert({ user_id: a.userId, email: `admin-${run}@example.com` });
    if (error) throw error;

    const { data, error: eventError } = await admin
      .from("memorial_events")
      .insert({ slug, person_name: "Test Grandfather", is_published: true })
      .select("id")
      .single();
    if (eventError) throw eventError;
    eventId = data.id;
    const { error: seedError } = await admin.rpc("seed_default_menu", { p_event_id: eventId });
    if (seedError) throw seedError;
  });

  afterAll(async () => {
    if (!service) return;
    if (eventId) await service.from("memorial_events").delete().eq("id", eventId);
    for (const id of userIds) await service.auth.admin.deleteUser(id);
  });

  it("serves the public menu with live counts and no contact details", async () => {
    const itemId = await addItem("Public Check", 2);
    expect((await claim(itemId)).error).toBeNull();
    const { data, error } = await anon.rpc("get_public_event", { p_slug: slug });
    expect(error).toBeNull();
    expect(data.event.person_name).toBe("Test Grandfather");
    expect(data.event.welcome_message).toMatch(/overwhelming love and support/);
    expect(data.categories.map((c: { short_name: string }) => c.short_name)).toEqual(
      expect.arrayContaining(["MAIN DISHES", "SIDES", "DESSERTS", "DRINKS", "SUPPLIES"])
    );
    const item = data.items.find((i: { id: string }) => i.id === itemId);
    expect(item).toMatchObject({ quantity_needed: 2, quantity_claimed: 1, claimed_by: [] });
    const json = JSON.stringify(data);
    expect(json).not.toContain("555-0100");
    expect(json).not.toContain("tasha@example.com");
    expect(json).not.toContain("Tasha");
  });

  it("blocks anonymous reads of contributor data and private tables", async () => {
    for (const table of ["contributions", "suggested_items", "admin_users"]) {
      const { data, error } = await anon.from(table).select("*");
      expect(error?.code, table).toBe("42501");
      expect(data).toBeNull();
    }
    const { error } = await anon.from("contributions").insert({ event_id: eventId, food_item_id: eventId, contributor_name: "x" });
    expect(error?.code).toBe("42501");
    const { error: updateError } = await anon.from("food_items").update({ quantity_needed: 999 }).eq("event_id", eventId).select();
    // RLS: anon has no update policy, so nothing is touched.
    const { data: check } = await anon.rpc("get_public_event", { p_slug: slug });
    expect(updateError === null || updateError.code === "42501").toBe(true);
    expect(check.items.every((i: { quantity_needed: number }) => i.quantity_needed !== 999)).toBe(true);
  });

  it("shows first name + last initial only when the family turns it on", async () => {
    const itemId = await addItem("Names Check", 3);
    await claim(itemId, 1, "  denise   carter ");
    await admin.from("settings").update({ show_contributor_names: true }).eq("event_id", eventId);
    const { data } = await anon.rpc("get_public_event", { p_slug: slug });
    expect(data.items.find((i: { id: string }) => i.id === itemId).claimed_by).toEqual(["denise C."]);
    await admin.from("settings").update({ show_contributor_names: false }).eq("event_id", eventId);
  });

  it("covers an item when the final slot is claimed, then refuses more", async () => {
    const itemId = await addItem("Final Slot", 2);
    expect((await claim(itemId, 1)).error).toBeNull();
    const tooMany = await claim(itemId, 2);
    expect(tooMany.error?.message).toBe("ITEM_FULL");
    expect(tooMany.error?.hint).toBe("1");
    expect((await claim(itemId, 1)).error).toBeNull();
    const afterFull = await claim(itemId, 1);
    expect(afterFull.error?.message).toBe("ITEM_COVERED");
    const { data } = await anon.rpc("get_public_event", { p_slug: slug });
    expect(data.items.find((i: { id: string }) => i.id === itemId).quantity_claimed).toBe(2);
  });

  it("lets exactly one of many simultaneous claims take the last slot", async () => {
    const itemId = await addItem("Race For One", 1);
    const results = await Promise.all(Array.from({ length: 25 }, (_, n) => claim(itemId, 1, `Racer ${n}`)));
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    for (const r of results.filter((r) => r.error)) expect(["ITEM_FULL", "ITEM_COVERED"]).toContain(r.error!.message);
    const { count } = await admin.from("contributions").select("*", { count: "exact", head: true }).eq("food_item_id", itemId).neq("status", "cancelled");
    expect(count).toBe(1);
  });

  it("never overclaims under concurrent multi-unit claims", async () => {
    const itemId = await addItem("Race For Five", 5);
    const results = await Promise.all(Array.from({ length: 30 }, (_, n) => claim(itemId, 1 + (n % 2), `Racer ${n}`)));
    const { data } = await admin.from("contributions").select("quantity").eq("food_item_id", itemId).neq("status", "cancelled");
    const total = (data ?? []).reduce((s, r) => s + r.quantity, 0);
    expect(total).toBeLessThanOrEqual(5);
    expect(total).toBeGreaterThanOrEqual(4);
    expect(results.some((r) => r.error)).toBe(true);
  });

  it("lets a guest view, change and cancel only their own sign-up by token", async () => {
    const itemId = await addItem("Token Item", 3);
    const { data: claimed } = await claim(itemId, 1, "Robert Lee");
    const token = claimed.token as string;
    expect(token.length).toBeGreaterThanOrEqual(30);

    const { data: view } = await anon.rpc("get_contribution_by_token", { p_token: token });
    expect(view).toMatchObject({ kind: "contribution", status: "confirmed", item_name: "Token Item", quantity: 1, max_quantity: 3 });
    expect(JSON.stringify(view)).not.toContain("555-0100");

    expect((await anon.rpc("get_contribution_by_token", { p_token: token.slice(0, -2) + "xx" })).data).toBeNull();

    await claim(itemId, 1, "Someone Else");
    const tooMuch = await anon.rpc("update_contribution_by_token", { p_token: token, p_quantity: 3, p_note: null });
    expect(tooMuch.error?.message).toBe("ITEM_FULL");
    const ok = await anon.rpc("update_contribution_by_token", { p_token: token, p_quantity: 2, p_note: "Two trays" });
    expect(ok.error).toBeNull();
    expect(ok.data).toMatchObject({ quantity: 2, note: "Two trays", max_quantity: 2 });

    const cancelled = await anon.rpc("cancel_contribution_by_token", { p_token: token });
    expect(cancelled.data).toMatchObject({ status: "cancelled" });
    const { data: pub } = await anon.rpc("get_public_event", { p_slug: slug });
    expect(pub.items.find((i: { id: string }) => i.id === itemId).quantity_claimed).toBe(1);
    expect((await anon.rpc("cancel_contribution_by_token", { p_token: token })).error?.message).toBe("NOT_EDITABLE");
    expect((await anon.rpc("update_contribution_by_token", { p_token: "x".repeat(32), p_quantity: 1, p_note: null })).error?.message).toBe(
      "NOT_FOUND"
    );
  });

  it("keeps suggestions pending until an admin approves them", async () => {
    const { data, error } = await anon.rpc("submit_suggested_item", {
      p_slug: slug,
      p_name: "Aunt May",
      p_phone: "555-0199",
      p_email: null,
      p_item_name: "Deviled Eggs",
      p_quantity_text: "3 dozen",
      p_note: null,
    });
    expect(error).toBeNull();
    const token = data.token as string;
    expect((await anon.rpc("get_contribution_by_token", { p_token: token })).data).toMatchObject({ kind: "suggestion", status: "pending" });

    let { data: pub } = await anon.rpc("get_public_event", { p_slug: slug });
    expect(pub.items.some((i: { name: string }) => i.name === "Deviled Eggs")).toBe(false);

    // A non-admin can't approve.
    const { data: pending } = await admin.from("suggested_items").select("id").eq("event_id", eventId).eq("status", "pending").single();
    expect((await outsider.rpc("approve_suggested_item", { p_suggestion_id: pending!.id })).error?.message).toBe("NOT_AUTHORIZED");

    const approved = await admin.rpc("approve_suggested_item", { p_suggestion_id: pending!.id });
    expect(approved.error).toBeNull();
    ({ data: pub } = await anon.rpc("get_public_event", { p_slug: slug }));
    const eggs = pub.items.find((i: { name: string }) => i.name === "Deviled Eggs");
    expect(eggs).toMatchObject({ quantity_needed: 1, quantity_claimed: 1, description: "3 dozen" });
    expect(pub.categories.find((c: { id: string }) => c.id === eggs.category_id).name).toBe("Other");
    expect((await anon.rpc("get_contribution_by_token", { p_token: token })).data).toMatchObject({
      kind: "contribution",
      status: "confirmed",
      amount_detail: "3 dozen",
    });
    expect((await admin.rpc("approve_suggested_item", { p_suggestion_id: pending!.id })).error?.message).toBe("NOT_EDITABLE");
  });

  it("protects admin operations from signed-in non-admins", async () => {
    expect((await outsider.from("contributions").select("*").eq("event_id", eventId)).data).toEqual([]);
    expect((await outsider.from("suggested_items").select("*").eq("event_id", eventId)).data).toEqual([]);
    const { data: updated } = await outsider.from("food_items").update({ quantity_needed: 999 }).eq("event_id", eventId).select();
    expect(updated).toEqual([]);
    const selfPromote = await outsider.from("admin_users").insert({ user_id: userIds[1] });
    expect(selfPromote.error).not.toBeNull();
    expect((await outsider.rpc("add_memorial_admin", { p_email: `outsider-${run}@example.com` })).error?.message).toBe("NOT_AUTHORIZED");
    expect((await outsider.rpc("seed_default_menu", { p_event_id: eventId })).error?.message).toBe("NOT_AUTHORIZED");
    const { data: draft } = await admin.from("memorial_events").insert({ slug: `${slug}-draft`, person_name: "Draft" }).select("id").single();
    expect((await outsider.from("memorial_events").select("id").eq("id", draft!.id)).data).toEqual([]);
    expect((await anon.rpc("get_public_event", { p_slug: `${slug}-draft` })).data).toBeNull();
    expect((await admin.rpc("get_public_event", { p_slug: `${slug}-draft` })).data?.event.person_name).toBe("Draft");
    await admin.from("memorial_events").delete().eq("id", draft!.id);
  });

  it("applies the same capacity rules to admin edits", async () => {
    const itemId = await addItem("Admin Rules", 2);
    await claim(itemId, 2);
    const over = await admin.from("contributions").insert({ event_id: eventId, food_item_id: itemId, contributor_name: "Admin Add", quantity: 1, source: "admin" });
    expect(over.error?.message).toBe("ITEM_FULL");
    const lower = await admin.from("food_items").update({ quantity_needed: 1 }).eq("id", itemId);
    expect(lower.error?.message).toBe("BELOW_CLAIMED");
    expect((await admin.from("food_items").update({ quantity_needed: 3 }).eq("id", itemId)).error).toBeNull();
    const ok = await admin.from("contributions").insert({ event_id: eventId, food_item_id: itemId, contributor_name: "Admin Add", quantity: 1, source: "admin" }).select().single();
    expect(ok.error).toBeNull();
    // Moving a sign-up onto a full item is refused too.
    const otherId = await addItem("Admin Move Target", 1);
    await claim(otherId, 1);
    expect((await admin.from("contributions").update({ food_item_id: otherId }).eq("id", ok.data.id)).error?.message).toBe("ITEM_FULL");
    // Received / cancelled transitions stamp their times.
    const received = await admin.from("contributions").update({ status: "received" }).eq("id", ok.data.id).select().single();
    expect(received.data.received_at).not.toBeNull();
  });

  it("refuses hidden, manually covered, and post-deadline claims", async () => {
    const hidden = await addItem("Hidden Item", 2, { is_hidden: true });
    expect((await claim(hidden)).error?.message).toBe("NOT_FOUND");
    const { data: pub } = await anon.rpc("get_public_event", { p_slug: slug });
    expect(pub.items.some((i: { id: string }) => i.id === hidden)).toBe(false);

    const covered = await addItem("Covered Item", 2, { manually_covered: true });
    expect((await claim(covered)).error?.message).toBe("ITEM_COVERED");

    const open = await addItem("Deadline Item", 2);
    const yesterday = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    await admin.from("memorial_events").update({ signup_deadline: yesterday }).eq("id", eventId);
    expect((await claim(open)).error?.message).toBe("SIGNUPS_CLOSED");
    const { data: closed } = await anon.rpc("get_public_event", { p_slug: slug });
    expect(closed).toMatchObject({ signups_open: false, deadline_passed: true });
    // Admins can still record sign-ups after the deadline.
    expect(
      (await admin.from("contributions").insert({ event_id: eventId, food_item_id: open, contributor_name: "Late Call", quantity: 1, source: "admin" })).error
    ).toBeNull();
    await admin.from("memorial_events").update({ signup_deadline: null }).eq("id", eventId);

    await admin.from("settings").update({ accepting_signups: false }).eq("event_id", eventId);
    expect((await claim(open)).error?.message).toBe("SIGNUPS_CLOSED");
    await admin.from("settings").update({ accepting_signups: true }).eq("event_id", eventId);
    expect((await claim(open)).error).toBeNull();
  });

  it("validates guest input in the database", async () => {
    const itemId = await addItem("Validation Item", 2);
    expect((await claim(itemId, 1, "   ")).error?.message).toBe("INVALID_INPUT");
    expect((await claim(itemId, 0)).error?.message).toBe("INVALID_INPUT");
    const noAck = await anon.rpc("claim_food_item", {
      p_item_id: itemId,
      p_name: "X",
      p_phone: null,
      p_email: null,
      p_quantity: 1,
      p_note: null,
      p_acknowledged: false,
    });
    expect(noAck.error?.message).toBe("ACK_REQUIRED");
    const badEmail = await anon.rpc("claim_food_item", {
      p_item_id: itemId,
      p_name: "X",
      p_phone: null,
      p_email: "not-an-email",
      p_quantity: 1,
      p_note: null,
      p_acknowledged: true,
    });
    expect(badEmail.error).not.toBeNull();
    expect((await claim(itemId, 1, "x".repeat(101))).error?.message).toBe("INVALID_INPUT");
  });
});
