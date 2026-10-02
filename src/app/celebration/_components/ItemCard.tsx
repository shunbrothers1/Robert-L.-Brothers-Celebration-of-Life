"use client";

import { formatAmount, itemProgress, STATUS_LABEL } from "@/lib/celebration/format";
import type { PublicItem } from "@/lib/celebration/types";

const STATUS_STYLES = {
  needed: "bg-gold-50 text-gold-700 ring-gold-100",
  almost: "bg-navy-50 text-navy-700 ring-navy-200",
  covered: "bg-navy-100 text-navy-800 ring-navy-200",
} as const;

export default function ItemCard({
  item,
  signupsOpen,
  onSignUp,
}: {
  item: PublicItem;
  signupsOpen: boolean;
  onSignUp: (item: PublicItem) => void;
}) {
  const p = itemProgress(item);
  const covered = p.status === "covered";
  const titleId = `item-${item.id}`;

  return (
    <article
      aria-labelledby={titleId}
      className={`m-card flex flex-col gap-3 p-5 ${covered ? "border-navy-200 bg-navy-50/60 shadow-none" : ""}`}
    >
      {item.is_priority && !covered && (
        <p className="-mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-gold-700 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-white">
          <span aria-hidden="true">★</span> Most Needed
        </p>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={titleId} className="font-display text-[1.35rem] font-semibold leading-snug text-charcoal">
            {item.name}
          </h3>
          {p.needed > 0 && (
            <p className="text-[16px] text-slate-600">
              {formatAmount(p.needed, item.unit)} needed
            </p>
          )}
        </div>
        <span
          className={`mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${STATUS_STYLES[p.status]}`}
        >
          {STATUS_LABEL[p.status]}
        </span>
      </div>

      {item.description && <p className="text-[16px] text-slate-600">{item.description}</p>}

      {covered ? (
        <p className="flex items-center gap-2 text-[17px] font-bold tracking-wide text-navy-700">
          <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-700 text-sm text-white">
            ✓
          </span>
          COVERED — THANK YOU!
        </p>
      ) : (
        <>
          <div>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-mist-200"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={p.needed}
              aria-valuenow={p.claimed}
              aria-label={`${p.claimed} of ${p.needed} claimed`}
            >
              <div className="h-full rounded-full bg-navy-600 transition-[width]" style={{ width: `${p.percent}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-[15px] text-slate-600">
                {p.claimed} of {p.needed} claimed
              </p>
              <p className="text-[15px] font-bold uppercase tracking-wide text-gold-700">
                {p.remaining} more needed
              </p>
            </div>
          </div>
        </>
      )}

      {item.claimed_by.length > 0 && (
        <p className="text-[15px] text-slate-600">
          Claimed by {item.claimed_by.join(", ")}
        </p>
      )}

      {!covered && (
        <button
          type="button"
          className="m-btn-primary mt-1 w-full"
          disabled={!signupsOpen}
          onClick={() => onSignUp(item)}
        >
          {signupsOpen ? "SIGN UP TO BRING THIS" : "SIGN-UPS ARE CLOSED"}
        </button>
      )}
    </article>
  );
}
