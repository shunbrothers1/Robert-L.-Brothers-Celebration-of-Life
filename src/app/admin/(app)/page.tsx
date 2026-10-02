import Link from "next/link";
import NewEventForm from "./NewEventForm";
import { createAdminSessionClient } from "@/lib/celebration/db";
import { formatLongDate } from "@/lib/celebration/format";
import type { MemorialEvent } from "@/lib/celebration/types";

export const metadata = { title: "Events" };

export default async function AdminHome() {
  const supabase = await createAdminSessionClient();
  const { data } = await supabase.from("memorial_events").select("*").order("created_at", { ascending: false });
  const events = (data ?? []) as MemorialEvent[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Events</h1>
        <p className="mt-1 text-slate-600">Each event has its own page, menu, and sign-up list.</p>
      </div>

      {events.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/admin/events/${e.id}`} className="m-card block p-5 hover:border-navy-300">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-semibold">{e.person_name}</p>
                    <p className="text-slate-600">{e.event_name}</p>
                    {e.event_date && <p className="text-sm text-slate-500">{formatLongDate(e.event_date)}</p>}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${e.is_published ? "bg-navy-100 text-navy-800" : "bg-mist-200 text-slate-600"}`}
                  >
                    {e.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-3 font-mono text-xs text-slate-500">/celebration/{e.slug}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <NewEventForm firstEvent={events.length === 0} />
    </div>
  );
}
