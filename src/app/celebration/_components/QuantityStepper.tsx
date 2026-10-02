"use client";

import { formatAmount } from "@/lib/celebration/format";

/** Big −/+ buttons instead of a number field: no keyboard, no typos. */
export default function QuantityStepper({
  value,
  min,
  max,
  unit,
  labelledBy,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  labelledBy?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3" role="group" aria-labelledby={labelledBy}>
      <button
        type="button"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-semibold text-sage-800 ring-1 ring-cream-400 hover:bg-sage-50 disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Less"
      >
        −
      </button>
      <output className="min-w-0 flex-1 rounded-xl bg-white px-3 py-3 text-center text-[18px] font-semibold ring-1 ring-cream-300" aria-live="polite">
        {formatAmount(value, unit)}
      </output>
      <button
        type="button"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-semibold text-sage-800 ring-1 ring-cream-400 hover:bg-sage-50 disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="More"
      >
        +
      </button>
    </div>
  );
}
