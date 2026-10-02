import Flourish from "./Flourish";
import { formatLifeDates, formatLongDate } from "@/lib/celebration/format";
import type { PublicEventInfo } from "@/lib/celebration/types";

function Ornament() {
  return (
    <div className="flex items-center justify-center gap-3 text-gold-500" aria-hidden="true">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold-400" />
      <span className="text-[10px]">◆</span>
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold-400" />
    </div>
  );
}

/**
 * The top of the guest page, kept compact so that on a phone the first
 * screen shows: Celebration of Life → portrait → name → date → the start of
 * the family's message (the rest of the event details follow the
 * call-to-action, in EventDetails). Sits on the dark hero, so text is light.
 */
export default function MemorialHeader({ event }: { event: PublicEventInfo }) {
  const lifeDates = formatLifeDates(event.birth_date_text, event.passing_date_text);
  const date = formatLongDate(event.event_date);

  return (
    <header className="relative px-4 pb-4 pt-4 text-center">
      <p className="m-eyebrow text-[11px] text-white">{event.event_name}</p>
      <Flourish className="mt-1.5" />

      {event.photo_url && (
        // Arched frame: outer gold line, wide cream band, inner gold line.
        // The frame has a fixed shape; the WHOLE photo is fitted inside it
        // (object-contain, centered side to side and resting on the bottom so
        // spare space falls into the arch) on navy, never zoomed or cropped to
        // fill. Lily clusters are absolutely positioned at the lower sides
        // so they overlap the frame without adding height.
        <div className="relative mx-auto mt-2.5 w-[53vw] max-w-[220px]">
          <div className="rounded-t-[999px] bg-gradient-to-b from-gold-100 via-gold-400 to-gold-600 p-[2px] shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
            <div className="rounded-t-[999px] bg-ivory p-[7px]">
              <div className="rounded-t-[999px] bg-gradient-to-b from-gold-400 to-gold-600 p-[1.5px]">
                <div className="aspect-[4/5] overflow-hidden rounded-t-[999px] bg-[radial-gradient(ellipse_at_center,_#1d3a6b_0%,_#0b1f3a_80%)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL from any host */}
                  <img
                    src={event.photo_url}
                    alt={`Photo of ${event.person_name}`}
                    className="h-full w-full object-contain object-bottom"
                    fetchPriority="high"
                  />
                </div>
              </div>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static decoration */}
          <img
            src="/art/lily-cluster.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-3 -left-[30%] w-[46%] select-none"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- static decoration */}
          <img
            src="/art/lily-cluster.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-3 -right-[30%] w-[46%] -scale-x-100 select-none"
          />
        </div>
      )}

      <h1 className="relative mx-auto mt-3 max-w-2xl font-display text-[clamp(1.55rem,7.4vw,3rem)] font-semibold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
        {event.person_name}
      </h1>
      {lifeDates && <p className="mt-0.5 font-display text-lg italic text-gold-400">{lifeDates}</p>}

      <div className="mt-2">
        <Ornament />
      </div>

      {date && (
        <div className="mt-1.5">
          <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.25em] text-gold-400">Date</p>
          <p className="font-display text-[19px] leading-7 text-white">{date}</p>
        </div>
      )}
    </header>
  );
}
