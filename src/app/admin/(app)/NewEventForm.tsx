"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminBrowserClient } from "@/lib/celebration/browser";
import { friendlyError } from "@/lib/celebration/errors";
import { slugify } from "@/lib/celebration/format";

export default function NewEventForm({ firstEvent }: { firstEvent: boolean }) {
  const router = useRouter();
  const [personName, setPersonName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [seed, setSeed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(personName);
  const finalSlug = slugify(effectiveSlug);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!personName.trim()) return setError("Please enter the person's name.");
    if (!finalSlug) return setError("Please enter a link name using letters and numbers.");
    setBusy(true);
    const supabase = adminBrowserClient();
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("memorial_events")
      .insert({
        person_name: personName.trim(),
        slug: finalSlug,
        event_date: eventDate || null,
        created_by: user.user?.id ?? null,
      })
      .select("id")
      .single();
    if (error) {
      setBusy(false);
      return setError(
        error.code === "23505" ? "That link name is already used by another event. Please pick another." : friendlyError(error)
      );
    }
    if (seed) {
      const { error: seedError } = await supabase.rpc("seed_default_menu", { p_event_id: data.id });
      if (seedError) console.error(seedError);
    }
    router.push(`/admin/events/${data.id}/settings`);
    router.refresh();
  }

  return (
    <form onSubmit={create} className="m-card space-y-4 p-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">{firstEvent ? "Create your event" : "New event"}</h2>
        <p className="text-stone-600">You can fill in the rest (photo, location, times, message) on the next screen.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="m-label" htmlFor="new-name">
            Full name of your loved one
          </label>
          <input id="new-name" className="m-admin-input" value={personName} onChange={(e) => setPersonName(e.target.value)} maxLength={120} />
        </div>
        <div>
          <label className="m-label" htmlFor="new-date">
            Funeral / repast date
          </label>
          <input id="new-date" type="date" className="m-admin-input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="m-label" htmlFor="new-slug">
            Link name
          </label>
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-sm text-stone-500">/celebration/</span>
            <input
              id="new-slug"
              className="m-admin-input font-mono"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"));
              }}
              maxLength={80}
            />
          </div>
        </div>
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-sage-700" checked={seed} onChange={(e) => setSeed(e.target.checked)} />
        <span>
          Start with the suggested menu (main dishes, sides, desserts, drinks, supplies). Every item can be edited or
          deleted afterwards.
        </span>
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-800">{error}</p>}
      <button type="submit" className="m-btn-primary" disabled={busy}>
        {busy ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}
