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
      <dt className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">{label}</dt>
      <dd className="mt-1 font-display text-[19px] text-white">{children}</dd>
    </div>
  );
}

export default function MemorialHeader({ event }: { event: PublicEventInfo }) {
  const lifeDates = formatLifeDates(event.birth_date_text, event.passing_date_text);
  const date = formatLongDate(event.event_date);
  const hasLocation = event.repast_location_name || event.repast_address;

  return (
    // Sits on the dark hero (see HeroArt), so text is light and labels gold.
    <header className="relative px-4 pb-10 pt-12 text-center">
      <p className="m-eyebrow text-white">{event.event_name}</p>
      <Flourish className="mt-3" />

      {event.photo_url && (
        // Arched portrait like a printed program: outer gold line, wide
        // cream border, inner gold line, with lily clusters at the base.
        // The photo keeps its own proportions (no fixed crop box); only a
        // very tall photo is trimmed, from the bottom.
        <div className="relative mx-auto mt-7 w-[76%] max-w-[340px] pb-2">
          <div className="rounded-t-[999px] bg-gradient-to-b from-gold-100 via-gold-400 to-gold-600 p-[3px] shadow-[0_14px_40px_rgba(0,0,0,0.5)]">
            <div className="rounded-t-[999px] bg-ivory p-[10px] sm:p-3">
              <div className="rounded-t-[999px] bg-gradient-to-b from-gold-400 to-gold-600 p-[2px]">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL from any host */}
                <img
                  src={event.photo_url}
                  alt={`Photo of ${event.person_name}`}
                  className="block h-auto max-h-[480px] w-full rounded-t-[999px] bg-navy-800 object-cover object-top"
                  fetchPriority="high"
                />
              </div>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static decoration */}
          <img src="/art/lily-cluster.png" alt="" aria-hidden="true" className="pointer-events-none absolute -bottom-6 -left-[27%] w-[54%] select-none" />
          {/* eslint-disable-next-line @next/next/no-img-element -- static decoration */}
          <img src="/art/lily-cluster.png" alt="" aria-hidden="true" className="pointer-events-none absolute -bottom-6 -right-[27%] w-[54%] -scale-x-100 select-none" />
        </div>
      )}

      <h1 className="relative mx-auto mt-6 max-w-2xl font-display text-[2.4rem] font-semibold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-5xl">
        {event.person_name}
      </h1>
      {lifeDates && <p className="mt-2 font-display text-xl italic text-gold-400">{lifeDates}</p>}

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
                className="text-gold-100 underline decoration-gold-400/70 underline-offset-4"
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
