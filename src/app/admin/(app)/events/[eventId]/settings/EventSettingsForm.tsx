"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNote, useAdminAction } from "../../../_components/useAdminAction";
import { adminBrowserClient } from "@/lib/celebration/browser";
import { slugify } from "@/lib/celebration/format";
import { uploadMemorialPhoto } from "@/lib/celebration/upload";
import {
  DEFAULT_GIVING_MESSAGE,
  DEFAULT_GIVING_TITLE,
  GIVING_TYPES,
  normalizeGivingMethods,
  type GivingMethod,
  type GivingType,
} from "@/lib/celebration/giving";
import type { EventSettings, MemorialEvent } from "@/lib/celebration/types";

const TIMEZONES = [
  ["America/New_York", "Eastern"],
  ["America/Chicago", "Central"],
  ["America/Denver", "Mountain"],
  ["America/Phoenix", "Arizona"],
  ["America/Los_Angeles", "Pacific"],
  ["America/Anchorage", "Alaska"],
  ["Pacific/Honolulu", "Hawaii"],
] as const;

type Form = Omit<MemorialEvent, "id" | "created_at" | "updated_at"> & Omit<EventSettings, "event_id">;

function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="m-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-mist-100 p-4">
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-slate-600">{hint}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className={`text-xs font-bold uppercase ${checked ? "text-navy-700" : "text-slate-500"}`}>{checked ? "On" : "Off"}</span>
        <input type="checkbox" role="switch" className="h-6 w-6 accent-navy-700" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      </span>
    </label>
  );
}

function PhotoField({
  eventId,
  label,
  value,
  onChange,
}: {
  eventId: string;
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = `photo-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <p className="m-label">{label}</p>
      <div className="flex flex-wrap items-center gap-4">
        {value ? (
          /* eslint-disable-next-line @next/next/no-img-element -- preview of an uploaded or pasted URL */
          <img src={value} alt="" className="h-24 w-20 rounded-lg object-cover ring-1 ring-mist-300" />
        ) : (
          <div className="flex h-24 w-20 items-center justify-center rounded-lg bg-mist-200 text-xs text-slate-500">No photo</div>
        )}
        <div className="space-y-2">
          <label htmlFor={id} className="m-admin-btn cursor-pointer bg-white ring-1 ring-mist-400 hover:bg-mist-100">
            {uploading ? "Uploading…" : value ? "Replace photo" : "Upload photo"}
          </label>
          <input
            id={id}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploading(true);
              setError(null);
              try {
                onChange(await uploadMemorialPhoto(eventId, file));
              } catch (err) {
                setError(err instanceof Error ? err.message : "Upload failed.");
              } finally {
                setUploading(false);
              }
            }}
          />
          {value && (
            <button type="button" className="block text-sm text-red-700 underline" onClick={() => onChange(null)}>
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        className="m-admin-input mt-2 text-sm"
        placeholder="…or paste an image URL"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.trim() || null)}
        aria-label={`${label} URL`}
      />
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export default function EventSettingsForm({ event, settings }: { event: MemorialEvent; settings: EventSettings }) {
  const router = useRouter();
  const { run, busy, error, setError } = useAdminAction();
  const [saved, setSaved] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  // The column comes from migration 0002; "select *" includes it once it exists.
  const hasArtworkColumn = "background_image_url" in event;
  // Monetary gifts come from migration 0003.
  const hasGivingColumns = "giving_methods" in event;
  const [giving, setGiving] = useState(() => ({
    enabled: Boolean(event.giving_enabled),
    title: event.giving_title ?? "",
    message: event.giving_message ?? "",
    methods: normalizeGivingMethods(event.giving_methods),
  }));
  const [f, setF] = useState<Form>({
    slug: event.slug,
    event_name: event.event_name,
    person_name: event.person_name,
    birth_date_text: event.birth_date_text,
    passing_date_text: event.passing_date_text,
    photo_url: event.photo_url,
    background_image_url: event.background_image_url ?? null,
    event_date: event.event_date,
    service_info: event.service_info,
    repast_time_text: event.repast_time_text,
    repast_location_name: event.repast_location_name,
    repast_address: event.repast_address,
    welcome_message: event.welcome_message,
    signup_deadline: event.signup_deadline,
    timezone: event.timezone,
    memorial_photo_url: event.memorial_photo_url,
    biography: event.biography,
    favorite_quote: event.favorite_quote,
    gallery_urls: event.gallery_urls ?? [],
    is_published: event.is_published,
    show_contributor_names: settings.show_contributor_names,
    allow_suggestions: settings.allow_suggestions,
    show_memorial_section: settings.show_memorial_section,
    accepting_signups: settings.accepting_signups,
  });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setSaved(false);
    setF((prev) => ({ ...prev, [k]: v }));
  };
  const text = (k: keyof Form) => ({
    id: `f-${k}`,
    value: (f[k] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, (e.target.value || null) as never),
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.person_name.trim()) return setError("Please enter the person's name.");
    const slug = slugify(f.slug);
    if (!slug) return setError("Please enter a link name.");
    const db = adminBrowserClient();
    const ok = await run(async () => {
      const eventResult = await db
        .from("memorial_events")
        .update({
          slug,
          event_name: f.event_name.trim() || "Celebration of Life",
          person_name: f.person_name.trim(),
          birth_date_text: f.birth_date_text?.trim() || null,
          passing_date_text: f.passing_date_text?.trim() || null,
          photo_url: f.photo_url,
          // Only send the artwork column once migration 0002 has added it.
          ...(hasArtworkColumn ? { background_image_url: f.background_image_url ?? null } : {}),
          ...(hasGivingColumns
            ? {
                giving_enabled: giving.enabled,
                giving_title: giving.title.trim() || null,
                giving_message: giving.message.trim() || null,
                giving_methods: normalizeGivingMethods(giving.methods),
              }
            : {}),
          event_date: f.event_date || null,
          service_info: f.service_info?.trim() || null,
          repast_time_text: f.repast_time_text?.trim() || null,
          repast_location_name: f.repast_location_name?.trim() || null,
          repast_address: f.repast_address?.trim() || null,
          welcome_message: f.welcome_message?.trim() || null,
          signup_deadline: f.signup_deadline || null,
          timezone: f.timezone,
          memorial_photo_url: f.memorial_photo_url,
          biography: f.biography?.trim() || null,
          favorite_quote: f.favorite_quote?.trim() || null,
          gallery_urls: f.gallery_urls,
          is_published: f.is_published,
        })
        .eq("id", event.id);
      if (eventResult.error) return eventResult;
      return db
        .from("settings")
        .update({
          show_contributor_names: f.show_contributor_names,
          allow_suggestions: f.allow_suggestions,
          show_memorial_section: f.show_memorial_section,
          accepting_signups: f.accepting_signups,
        })
        .eq("event_id", event.id);
    });
    if (ok) {
      setF((prev) => ({ ...prev, slug }));
      setSaved(true);
    }
  }

  async function deleteEvent() {
    const typed = window.prompt(
      `This permanently deletes the event, its whole food list, and every sign-up. Type the name "${event.person_name}" to confirm.`
    );
    if (typed?.trim() !== event.person_name) return;
    const ok = await run(() => adminBrowserClient().from("memorial_events").delete().eq("id", event.id));
    if (ok) router.push("/admin");
  }

  return (
    <form onSubmit={save} className="space-y-6 pb-24">
      <section className="m-card space-y-3 p-5">
        <h2 className="font-display text-xl font-semibold">Publishing &amp; sign-ups</h2>
        <Toggle
          checked={f.is_published}
          onChange={(v) => set("is_published", v)}
          label="Published"
          hint="When off, only admins can see the page. Turn on when you're ready to share the link."
        />
        <Toggle
          checked={f.accepting_signups}
          onChange={(v) => set("accepting_signups", v)}
          label="Accepting sign-ups"
          hint="Turn off to pause new sign-ups without taking the page down. Admins can still make changes."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sign-up deadline" htmlFor="f-signup_deadline" hint="Sign-ups close at the end of this day. Leave empty for no deadline.">
            <input type="date" className="m-admin-input" {...text("signup_deadline")} />
          </Field>
          <Field label="Time zone" htmlFor="f-timezone">
            <select id="f-timezone" className="m-admin-input" value={f.timezone} onChange={(e) => set("timezone", e.target.value)}>
              {TIMEZONES.map(([tz, name]) => (
                <option key={tz} value={tz}>
                  {name} ({tz})
                </option>
              ))}
              {!TIMEZONES.some(([tz]) => tz === f.timezone) && <option value={f.timezone}>{f.timezone}</option>}
            </select>
          </Field>
        </div>
      </section>

      <section className="m-card space-y-4 p-5">
        <h2 className="font-display text-xl font-semibold">Page header</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="f-person_name">
            <input className="m-admin-input" maxLength={120} {...text("person_name")} />
          </Field>
          <Field label="Heading" htmlFor="f-event_name" hint='Usually "Celebration of Life".'>
            <input className="m-admin-input" maxLength={120} {...text("event_name")} />
          </Field>
          <Field label="Born" htmlFor="f-birth_date_text" hint="A year or a full date, e.g. 1938">
            <input className="m-admin-input" maxLength={60} {...text("birth_date_text")} />
          </Field>
          <Field label="Passed" htmlFor="f-passing_date_text" hint="e.g. 2026">
            <input className="m-admin-input" maxLength={60} {...text("passing_date_text")} />
          </Field>
        </div>
        <PhotoField eventId={event.id} label="Photo" value={f.photo_url} onChange={(v) => set("photo_url", v)} />
        {hasArtworkColumn ? (
          <div>
            <PhotoField
              eventId={event.id}
              label="Background artwork (optional)"
              value={f.background_image_url ?? null}
              onChange={(v) => set("background_image_url", v)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Shown softly behind the top of the page — for example the floral design from the funeral program.
            </p>
          </div>
        ) : (
          <p className="rounded-lg bg-mist-200 px-3 py-2 text-sm text-slate-600">
            Background artwork: run <span className="break-all font-mono">supabase/migrations/0002_background_artwork.sql</span> in
            Supabase to turn this on.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Funeral / repast date" htmlFor="f-event_date">
            <input type="date" className="m-admin-input" {...text("event_date")} />
          </Field>
          <Field label="Repast time" htmlFor="f-repast_time_text" hint="e.g. Immediately following the service, about 1:00 PM">
            <input className="m-admin-input" maxLength={120} {...text("repast_time_text")} />
          </Field>
          <Field label="Repast location name" htmlFor="f-repast_location_name">
            <input className="m-admin-input" maxLength={160} {...text("repast_location_name")} />
          </Field>
          <Field label="Repast address" htmlFor="f-repast_address" hint="Guests can tap it to open maps.">
            <input className="m-admin-input" maxLength={300} {...text("repast_address")} />
          </Field>
        </div>
        <Field label="Service details (optional)" htmlFor="f-service_info" hint="e.g. Homegoing service at 11:00 AM, Greater Hope Baptist Church">
          <input className="m-admin-input" maxLength={300} {...text("service_info")} />
        </Field>
        <Field label="Message to guests" htmlFor="f-welcome_message">
          <textarea className="m-admin-input min-h-[140px]" maxLength={2000} {...text("welcome_message")} />
        </Field>
        <Field label="Link name" htmlFor="f-slug" hint="Changing this breaks any link you've already shared.">
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-sm text-slate-500">/celebration/</span>
            <input
              id="f-slug"
              className="m-admin-input font-mono"
              maxLength={80}
              value={f.slug}
              onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))}
            />
          </div>
        </Field>
      </section>

      <section className="m-card space-y-3 p-5">
        <h2 className="font-display text-xl font-semibold">What guests see</h2>
        <Toggle
          checked={f.show_contributor_names}
          onChange={(v) => set("show_contributor_names", v)}
          label="Show contributor first names publicly"
          hint='Shows "Claimed by Tasha B." on items. Phone numbers and emails are never shown publicly.'
        />
        <Toggle
          checked={f.allow_suggestions}
          onChange={(v) => set("allow_suggestions", v)}
          label="Allow suggestions"
          hint='Shows the "Suggest an item" option. Suggestions always wait for your approval.'
        />
        <Toggle
          checked={f.show_memorial_section}
          onChange={(v) => set("show_memorial_section", v)}
          label="Show memorial section"
          hint="A “Celebrating …” section with a photo, biography, and favorite saying below the food list."
        />
      </section>

      <section className="m-card space-y-4 p-5">
        <div>
          <h2 className="font-display text-xl font-semibold">Memorial section</h2>
          {!f.show_memorial_section && <p className="text-sm text-slate-600">Currently hidden — turn it on above to show it.</p>}
        </div>
        <PhotoField eventId={event.id} label="Memorial photo" value={f.memorial_photo_url} onChange={(v) => set("memorial_photo_url", v)} />
        <Field label="Favorite saying or quote" htmlFor="f-favorite_quote">
          <input className="m-admin-input" maxLength={500} {...text("favorite_quote")} />
        </Field>
        <Field label="Short biography" htmlFor="f-biography">
          <textarea className="m-admin-input min-h-[160px]" maxLength={8000} {...text("biography")} />
        </Field>
        <div>
          <p className="m-label">Additional photos</p>
          <div className="flex flex-wrap gap-3">
            {f.gallery_urls.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- preview */}
                <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover ring-1 ring-mist-300" />
                <button
                  type="button"
                  className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-white text-red-700 shadow ring-1 ring-mist-300"
                  onClick={() => set("gallery_urls", f.gallery_urls.filter((u) => u !== url))}
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-mist-400 text-center text-xs text-slate-500 hover:bg-mist-100">
              {galleryUploading ? "Uploading…" : "+ Add photos"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={galleryUploading || f.gallery_urls.length >= 24}
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []).slice(0, 24 - f.gallery_urls.length);
                  e.target.value = "";
                  if (!files.length) return;
                  setGalleryUploading(true);
                  try {
                    const urls: string[] = [];
                    for (const file of files) urls.push(await uploadMemorialPhoto(event.id, file));
                    setF((prev) => ({ ...prev, gallery_urls: [...prev.gallery_urls, ...urls] }));
                    setSaved(false);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Upload failed.");
                  } finally {
                    setGalleryUploading(false);
                  }
                }}
              />
            </label>
          </div>
        </div>
      </section>

      <GivingSection
        available={hasGivingColumns}
        value={giving}
        onChange={(v) => {
          setSaved(false);
          setGiving(v);
        }}
      />

      <section className="m-card space-y-2 border-red-200 p-5">
        <h2 className="font-display text-lg font-semibold text-red-800">Delete event</h2>
        <p className="text-sm text-slate-600">Permanently removes this event, its food list and every sign-up.</p>
        <button type="button" className="m-admin-btn bg-white text-red-700 ring-1 ring-red-300 hover:bg-red-50" onClick={deleteEvent}>
          Delete this event…
        </button>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-mist-300 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <button type="submit" className="m-admin-btn bg-navy-700 px-6 text-white hover:bg-navy-800" disabled={busy || galleryUploading}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm font-semibold text-navy-700">Saved ✓</span>}
          <div className="min-w-0 flex-1">
            <ErrorNote error={error} />
          </div>
        </div>
      </div>
    </form>
  );
}

type GivingDraft = { enabled: boolean; title: string; message: string; methods: GivingMethod[] };

/** Event Settings → Monetary Gifts: on/off, wording, and up to 8 ways to give. */
function GivingSection({
  available,
  value,
  onChange,
}: {
  available: boolean;
  value: GivingDraft;
  onChange: (v: GivingDraft) => void;
}) {
  if (!available) {
    return (
      <section className="m-card space-y-2 p-5">
        <h2 className="font-display text-xl font-semibold">Monetary gifts</h2>
        <p className="rounded-lg bg-mist-200 px-3 py-2 text-sm text-slate-600">
          To turn this on, run <span className="break-all font-mono">supabase/migrations/0003_monetary_gifts.sql</span> in
          Supabase&apos;s SQL Editor once, then reload this page.
        </p>
      </section>
    );
  }
  const setMethod = (i: number, patch: Partial<GivingMethod>) =>
    onChange({ ...value, methods: value.methods.map((m, j) => (j === i ? { ...m, ...patch } : m)) });

  return (
    <section className="m-card space-y-4 p-5">
      <div>
        <h2 className="font-display text-xl font-semibold">Monetary gifts</h2>
        <p className="text-sm text-slate-600">
          Adds a &ldquo;Make a Monetary Gift&rdquo; button under the food-list button and at the bottom of the food list. Gifts
          go straight to the accounts you list here — the site never handles money.
        </p>
      </div>
      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-mist-100 p-4">
        <span>
          <span className="block font-semibold">Show the monetary gift option</span>
          <span className="block text-sm text-slate-600">Guests only see it when this is on and at least one way to give is filled in.</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className={`text-xs font-bold uppercase ${value.enabled ? "text-navy-700" : "text-slate-500"}`}>{value.enabled ? "On" : "Off"}</span>
          <input
            type="checkbox"
            role="switch"
            className="h-6 w-6 accent-navy-700"
            checked={value.enabled}
            onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          />
        </span>
      </label>
      <div>
        <label className="m-label" htmlFor="giving-title">
          Page title
        </label>
        <input
          id="giving-title"
          className="m-admin-input"
          maxLength={80}
          placeholder={DEFAULT_GIVING_TITLE}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </div>
      <div>
        <label className="m-label" htmlFor="giving-message">
          Message
        </label>
        <textarea
          id="giving-message"
          className="m-admin-input min-h-[110px]"
          maxLength={1500}
          placeholder={DEFAULT_GIVING_MESSAGE}
          value={value.message}
          onChange={(e) => onChange({ ...value, message: e.target.value })}
        />
        <p className="mt-1 text-xs text-slate-500">Leave empty to use the suggested wording shown in gray.</p>
      </div>
      <div className="space-y-3">
        <p className="m-label">Ways to give</p>
        {value.methods.length === 0 && <p className="text-sm text-slate-500">None yet — add one below.</p>}
        {value.methods.map((m, i) => {
          const meta = GIVING_TYPES.find((t) => t.type === m.type) ?? GIVING_TYPES[0];
          return (
            <div key={i} className="grid gap-2 rounded-xl bg-mist-100 p-3 sm:grid-cols-[9rem_1fr_1fr_auto]">
              <select
                className="m-admin-input"
                value={m.type}
                onChange={(e) => setMethod(i, { type: e.target.value as GivingType })}
                aria-label="Type"
              >
                {GIVING_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.name}
                  </option>
                ))}
              </select>
              <input
                className="m-admin-input"
                placeholder={meta.placeholder}
                maxLength={200}
                value={m.value}
                onChange={(e) => setMethod(i, { value: e.target.value })}
                aria-label={meta.hint}
                title={meta.hint}
              />
              <input
                className="m-admin-input"
                placeholder="Name shown (optional)"
                maxLength={80}
                value={m.label ?? ""}
                onChange={(e) => setMethod(i, { label: e.target.value })}
                aria-label="Name shown"
              />
              <button
                type="button"
                className="m-admin-btn bg-white text-red-700 ring-1 ring-mist-400 hover:bg-red-50"
                onClick={() => onChange({ ...value, methods: value.methods.filter((_, j) => j !== i) })}
              >
                Remove
              </button>
            </div>
          );
        })}
        {value.methods.length < 8 && (
          <button
            type="button"
            className="m-admin-btn bg-white ring-1 ring-mist-400 hover:bg-mist-100"
            onClick={() => onChange({ ...value, methods: [...value.methods, { type: "cashapp", value: "" }] })}
          >
            + Add a way to give
          </button>
        )}
      </div>
    </section>
  );
}
