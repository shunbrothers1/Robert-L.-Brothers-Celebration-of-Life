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
export default function MemorialHeader({ event, hasGiving = false }: { event: PublicEventInfo; hasGiving?: boolean }) {
  const lifeDates = formatLifeDates(event.birth_date_text, event.passing_date_text);
  const date = formatLongDate(event.event_date);

  return (
    <header className="relative px-4 pb-3 pt-3 text-center">
      <p className="m-eyebrow text-[11px] text-white">{event.event_name}</p>
      <Flourish className="mt-1" />

      {event.photo_url && (
        // Arched frame that takes the PHOTO's shape: the photo's height is
        // set (it shrinks on shorter screens so the message and the
        // food-list button still fit on the first screen) and its width
        // follows its natural proportions, so the whole photo fills the
        // frame with nothing zoomed or cropped — only the arch rounds off
        // the top corners. Outer gold line, cream band, inner gold line.
        // Lily clusters are absolutely positioned (they add no height).
        <div
          className="m-portrait relative mx-auto mt-2 w-fit"
          // Room the photo gives up for the optional life-dates line and gift button.
          style={{ "--m-extra": `${(lifeDates ? 30 : 0) + (hasGiving ? 56 : 0)}px` } as React.CSSProperties}
        >
          <div className="rounded-t-[999px] bg-gradient-to-b from-gold-100 via-gold-400 to-gold-600 p-[2px] shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
            <div className="rounded-t-[999px] bg-ivory p-[6px]">
              <div className="rounded-t-[999px] bg-gradient-to-b from-gold-400 to-gold-600 p-[1.5px]">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL from any host */}
                <img
                  src={event.photo_url}
                  alt={`Photo of ${event.person_name}`}
                  className="m-portrait-photo block w-auto max-w-[68vw] rounded-t-[999px] object-cover"
                  fetchPriority="high"
                />
              </div>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static decoration */}
          <img
            src="/art/lily-cluster.png"
            alt=""
            aria-hidden="true"
            className="m-portrait-lily m-portrait-lily-left"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- static decoration */}
          <img
            src="/art/lily-cluster.png"
            alt=""
            aria-hidden="true"
            className="m-portrait-lily m-portrait-lily-right"
          />
        </div>
      )}

      <h1 className="relative mx-auto mt-2.5 max-w-2xl font-display text-[clamp(1.55rem,7.4vw,3rem)] font-semibold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
        {event.person_name}
      </h1>
      {lifeDates && <p className="mt-0.5 font-display text-lg italic text-gold-400">{lifeDates}</p>}

      <div className="mt-1.5">
        <Ornament />
      </div>

      {date && (
        <div className="mt-1">
          <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.25em] text-gold-400">Date</p>
          <p className="font-display text-[19px] leading-7 text-white">{date}</p>
        </div>
      )}
    </header>
  );
}
