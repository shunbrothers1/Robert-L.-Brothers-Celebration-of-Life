import Link from "next/link";
import { notFound } from "next/navigation";
import EventTabs from "./EventTabs";
import { loadEventBundle } from "@/lib/celebration/admin-data";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const bundle = await loadEventBundle(eventId);
  if (!bundle) notFound();
  const { event, suggestions } = bundle;
  const pending = suggestions.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <p className="m-eyebrow">{event.event_name}</p>
          <h1 className="font-display text-3xl font-semibold">{event.person_name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${event.is_published ? "bg-navy-100 text-navy-800" : "bg-mist-200 text-slate-600"}`}
          >
            {event.is_published ? "Published" : "Draft — not public yet"}
          </span>
          <Link href={`/celebration/${event.slug}`} target="_blank" className="m-admin-btn bg-white ring-1 ring-mist-400 hover:bg-mist-100">
            View public page ↗
          </Link>
        </div>
      </div>
      <EventTabs eventId={event.id} pendingSuggestions={pending} />
      <div>{children}</div>
    </div>
  );
}
