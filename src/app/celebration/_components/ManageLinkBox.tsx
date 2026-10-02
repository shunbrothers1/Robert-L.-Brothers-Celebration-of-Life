"use client";

import { useState } from "react";
import { useOrigin } from "@/lib/celebration/use-origin";

/** Shows a guest their private change/cancel link, with a one-tap copy. */
export default function ManageLinkBox({ token }: { token: string }) {
  const url = `${useOrigin()}/contribution/${token}`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 text-left ring-1 ring-cream-300">
      <p className="text-[15px] font-semibold">Need to change or cancel later?</p>
      <p className="mt-1 text-[15px] text-stone-600">
        Use your private link below. We&apos;ve also saved it on this phone — it will show at the top of the food list.
      </p>
      <p className="mt-2 break-all rounded-lg bg-cream-100 px-3 py-2 font-mono text-[13px] text-stone-700">{url}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="m-btn-quiet min-h-[44px] px-3 text-sm" onClick={copy}>
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <a className="m-btn-quiet min-h-[44px] px-3 text-sm" href={`/contribution/${token}`}>
          Open link
        </a>
      </div>
    </div>
  );
}
