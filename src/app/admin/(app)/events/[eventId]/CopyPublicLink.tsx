"use client";

import { useState } from "react";
import { useOrigin } from "@/lib/celebration/use-origin";
import { shareMessage } from "@/lib/celebration/format";

/** The link + suggested message the family texts out. */
export default function CopyPublicLink({ slug, personName }: { slug: string; personName: string }) {
  const url = `${useOrigin()}/celebration/${slug}`;
  const [copied, setCopied] = useState<"link" | "message" | null>(null);

  async function copy(kind: "link" | "message") {
    const text = kind === "link" ? url : `${shareMessage(personName)}\n\n${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  return (
    <div className="m-card space-y-3 p-5">
      <h2 className="font-display text-xl font-semibold">Share link</h2>
      <p className="break-all rounded-lg bg-mist-100 px-3 py-2 font-mono text-sm">{url}</p>
      <p className="text-sm text-slate-600">{shareMessage(personName)}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="m-admin-btn bg-navy-700 text-white hover:bg-navy-800" onClick={() => copy("link")}>
          {copied === "link" ? "Copied ✓" : "Copy link"}
        </button>
        <button type="button" className="m-admin-btn bg-white ring-1 ring-mist-400 hover:bg-mist-100" onClick={() => copy("message")}>
          {copied === "message" ? "Copied ✓" : "Copy message + link"}
        </button>
      </div>
    </div>
  );
}
