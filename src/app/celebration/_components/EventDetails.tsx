import { mapsUrl } from "@/lib/celebration/format";
import type { PublicEventInfo } from "@/lib/celebration/types";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400">{label}</dt>
      <dd className="mt-0.5 font-display text-[18px] leading-snug text-white">{children}</dd>
    </div>
  );
}

/** Service, repast location and time — shown right after the food-list button. */
export default function EventDetails({ event }: { event: PublicEventInfo }) {
  const hasLocation = event.repast_location_name || event.repast_address;
  if (!event.service_info && !hasLocation && !event.repast_time_text) return null;

  return (
    <dl className="mx-auto mt-6 grid max-w-xl gap-4 text-center">
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
  );
}
