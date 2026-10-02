"use client";

import { useState } from "react";
import { useOrigin, useCanShare } from "@/lib/celebration/use-origin";
import { shareMessage } from "@/lib/celebration/format";

export default function ShareButtons({ personName, path }: { personName: string; path: string }) {
  const url = `${useOrigin()}${path}`;
  const canShare = useCanShare();
  const [copied, setCopied] = useState(false);
  const message = shareMessage(personName);

  async function share() {
    try {
      await navigator.share({ title: `${personName} — Celebration of Life`, text: message, url });
    } catch {
      // The guest closed the share sheet — nothing to do.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${message}\n\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className="m-card p-6 text-center">
      <p className="font-display text-xl font-semibold">Share With Family &amp; Friends</p>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-slate-600">
        Know someone who would like to help? Send them this page.
      </p>
      <div className={`mt-4 grid gap-3 ${canShare ? "sm:grid-cols-2" : ""}`}>
        {canShare && (
          <button type="button" className="m-btn-gold w-full" onClick={share}>
            SHARE WITH FAMILY &amp; FRIENDS
          </button>
        )}
        <button type="button" className="m-btn-outline w-full" onClick={copy} aria-live="polite">
          {copied ? "LINK COPIED ✓" : "COPY LINK"}
        </button>
      </div>
    </div>
  );
}
