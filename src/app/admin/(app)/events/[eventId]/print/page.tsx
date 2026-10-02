import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";
import { loadEventBundle } from "@/lib/celebration/admin-data";
import { formatAmount, formatLongDate, itemProgress } from "@/lib/celebration/format";

export const metadata = { title: "Printable Checklist" };

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ phones?: string }>;
}) {
  const { eventId } = await params;
  const showPhones = (await searchParams).phones !== "0";
  const bundle = await loadEventBundle(eventId);
  if (!bundle) notFound();
  const { event, categories, items } = bundle;
  const base = `/admin/events/${event.id}`;

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-[14px] text-black print:max-w-none print:p-0 print:text-[12px]">
      <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
        <PrintButton />
        <a href={`${base}/export`} className="m-admin-btn bg-white ring-1 ring-mist-400 hover:bg-mist-100">
          Download contributor list (CSV)
        </a>
        <Link href={showPhones ? `${base}/print?phones=0` : `${base}/print`} className="m-admin-btn bg-white ring-1 ring-mist-400 hover:bg-mist-100">
          {showPhones ? "Hide phone numbers" : "Show phone numbers"}
        </Link>
      </div>

      <header className="mb-6 border-b border-black pb-3">
        <h1 className="font-display text-2xl font-semibold">Repast Checklist — {event.person_name}</h1>
        <p>
          {[formatLongDate(event.event_date), event.repast_location_name, event.repast_time_text].filter(Boolean).join(" · ")}
        </p>
        <p className="text-xs text-slate-600">Printed {new Date().toLocaleString("en-US")} · Family use only — contains contact details.</p>
      </header>

      {categories.map((c) => {
        const list = items.filter((i) => i.category_id === c.id && (!i.is_hidden || i.contributions.length > 0));
        if (list.length === 0) return null;
        return (
          <section key={c.id} className="mb-6 break-inside-avoid-page">
            <h2 className="mb-2 border-b border-slate-400 pb-1 text-base font-bold uppercase tracking-wide">{c.name}</h2>
            <ul className="space-y-1">
              {list.map((i) => {
                const p = itemProgress(i);
                return (
                  <li key={i.id}>
                    {i.contributions.map((con) => (
                      <p key={con.id} className="flex gap-2 py-0.5">
                        <span aria-hidden="true">{con.status === "received" ? "☑" : "☐"}</span>
                        <span>
                          <strong>{i.name}</strong> — {con.contributor_name} — {con.amount_detail ?? formatAmount(con.quantity, i.unit)}
                          {showPhones && con.phone ? ` — ${con.phone}` : ""}
                          {con.note ? <span className="text-slate-600"> ({con.note})</span> : null}
                        </span>
                      </p>
                    ))}
                    {p.status !== "covered" && p.remaining > 0 && (
                      <p className="flex gap-2 py-0.5 text-slate-600">
                        <span aria-hidden="true">☐</span>
                        <span>
                          <strong>{i.name}</strong> — <em>still needed: {formatAmount(p.remaining, i.unit)}</em>
                        </span>
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
