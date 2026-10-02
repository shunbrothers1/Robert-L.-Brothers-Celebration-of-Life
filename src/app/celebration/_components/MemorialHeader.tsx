import Flourish from "./Flourish";
import { formatLifeDates, formatLongDate, mapsUrl } from "@/lib/celebration/format";
import type { PublicEventInfo } from "@/lib/celebration/types";

function Ornament() {
  return (
    <div className="flex items-center justify-center gap-3 text-gold-500" aria-hidden="true">
      <span className="h-px w-20 bg-gradient-to-r from-transparent to-gold-400" />
      <span className="text-xs">◆</span>
      <span className="h-px w-20 bg-gradient-to-l from-transparent to-gold-400" />
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-700">{label}</dt>
      <dd className="mt-1 font-display text-[19px] text-charcoal">{children}</dd>
    </div>
  );
}

export default function MemorialHeader({ event }: { event: PublicEventInfo }) {
  const lifeDates = formatLifeDates(event.birth_date_text, event.passing_date_text);
  const date = formatLongDate(event.event_date);
  const hasLocation = event.repast_location_name || event.repast_address;

  return (
    <header className="relative isolate overflow-hidden bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#e3ecf7_55%,_#f2f6fb_100%)] px-4 pb-12 pt-12 text-center">
      {event.background_image_url && (
        <>
          {/* Family-supplied artwork (e.g. the program's florals), softened so text stays readable. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL from any host */}
          <img src={event.background_image_url} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.88)_0%,_rgba(242,246,251,0.72)_60%,_rgba(242,246,251,0.35)_100%)]" />
        </>
      )}
      <p className="m-eyebrow">{event.event_name}</p>
      <Flourish className="mt-3" />

      {event.photo_url && (
        <div className="mx-auto mt-6 w-44 sm:w-52">
          <div className="rounded-t-full border border-gold-400/60 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL from any host */}
            <img
              src={event.photo_url}
              alt={`Photo of ${event.person_name}`}
              className="aspect-[4/5] w-full rounded-t-full object-cover shadow-[0_8px_30px_rgba(19,40,75,0.22)]"
              fetchPriority="high"
            />
          </div>
        </div>
      )}

      <h1 className="mx-auto mt-6 max-w-2xl font-display text-[2.4rem] font-semibold leading-tight text-charcoal sm:text-5xl">
        {event.person_name}
      </h1>
      {lifeDates && <p className="mt-2 font-display text-xl italic text-gold-700">{lifeDates}</p>}

      <div className="mt-6">
        <Ornament />
      </div>

      <dl className="mx-auto mt-6 grid max-w-xl gap-5">
        {date && <Detail label="Date">{date}</Detail>}
        {event.service_info && <Detail label="Service">{event.service_info}</Detail>}
        {hasLocation && (
          <Detail label="Repast Location">
            {event.repast_location_name && <span className="block font-semibold">{event.repast_location_name}</span>}
            {event.repast_address && (
              <a
                href={mapsUrl(event.repast_address)}
                className="text-navy-700 underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                {event.repast_address}
              </a>
            )}
          </Detail>
        )}
        {event.repast_time_text && <Detail label="Repast Time">{event.repast_time_text}</Detail>}
      </dl>
    </header>
  );
}
