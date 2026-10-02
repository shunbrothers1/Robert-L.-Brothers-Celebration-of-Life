"use client";

import { useState } from "react";
import { givingDisplay, givingHref, givingTypeName, type GivingMethod } from "@/lib/celebration/giving";

const OPEN_LABEL: Record<string, string> = {
  cashapp: "Open Cash App",
  venmo: "Open Venmo",
  paypal: "Open PayPal",
  gofundme: "Open GoFundMe",
  link: "Open giving page",
};

/** One card per way to give: an open-the-app button and/or a copy button. */
export default function GiftMethods({ methods }: { methods: GivingMethod[] }) {
  const [copied, setCopied] = useState<number | null>(null);

  async function copy(i: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  return (
    <ul className="space-y-4">
      {methods.map((m, i) => {
        const href = givingHref(m);
        const shown = givingDisplay(m);
        const isLink = m.type === "gofundme" || m.type === "link";
        return (
          <li key={i} className="m-card border-gold-400/70 bg-ivory p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-700">{givingTypeName(m.type)}</p>
            {m.label && <p className="mt-1 font-display text-lg font-semibold text-charcoal">{m.label}</p>}
            {!isLink && <p className="mt-1 break-all font-display text-xl text-charcoal">{shown}</p>}
            {m.type === "zelle" && (
              <p className="mt-1 text-[15px] text-slate-600">Open your bank&apos;s app, choose Zelle, and send to the details above.</p>
            )}
            <div className={`mt-4 grid gap-2 ${href && !isLink ? "grid-cols-2" : ""}`}>
              {href && (
                <a href={href} target="_blank" rel="noopener noreferrer" className="m-btn-primary min-h-[48px] px-3 text-[15px]">
                  {OPEN_LABEL[m.type] ?? "Open"}
                </a>
              )}
              {!isLink && (
                <button type="button" className="m-btn-quiet min-h-[48px] px-3 text-[15px]" onClick={() => copy(i, shown)}>
                  {copied === i ? "Copied ✓" : m.type === "zelle" ? "Copy Zelle info" : "Copy"}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
