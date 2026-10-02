"use client";

import { useState } from "react";
import { ErrorNote, useAdminAction } from "../../../_components/useAdminAction";
import { adminBrowserClient } from "@/lib/celebration/browser";
import { formatDateTime } from "@/lib/celebration/format";
import type { FoodCategory, SuggestedItem } from "@/lib/celebration/types";

const btn = "m-admin-btn bg-white ring-1 ring-cream-400 hover:bg-cream-100";
const STATUS_BADGE: Record<SuggestedItem["status"], string> = {
  pending: "bg-gold-50 text-gold-700",
  approved: "bg-sage-100 text-sage-800",
  declined: "bg-stone-200 text-stone-600",
  withdrawn: "bg-stone-200 text-stone-600",
};

export default function SuggestionReview({ suggestions, categories }: { suggestions: SuggestedItem[]; categories: FoodCategory[] }) {
  const pending = suggestions.filter((s) => s.status === "pending");
  const reviewed = suggestions.filter((s) => s.status !== "pending");

  return (
    <div className="space-y-6">
      <p className="text-stone-600">
        Guests&apos; &ldquo;bring something else&rdquo; offers wait here as <strong>Pending Family Approval</strong>. Approving adds it
        to the public list as a covered item (so nobody duplicates it) with this guest as the confirmed contributor.
      </p>
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Pending ({pending.length})</h2>
        {pending.length === 0 && <p className="m-card p-5 text-stone-500">Nothing waiting for review.</p>}
        {pending.map((s) => (
          <PendingCard key={s.id} suggestion={s} categories={categories} />
        ))}
      </section>
      {reviewed.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Reviewed</h2>
          <ul className="m-card divide-y divide-cream-200">
            {reviewed.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <span>
                  <span className="font-semibold">{s.item_name}</span>
                  {s.quantity_text ? ` (${s.quantity_text})` : ""} — {s.contributor_name}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${STATUS_BADGE[s.status]}`}>{s.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PendingCard({ suggestion: s, categories }: { suggestion: SuggestedItem; categories: FoodCategory[] }) {
  const { run, busy, error } = useAdminAction();
  const other = categories.find((c) => c.name.toLowerCase() === "other");
  const [categoryId, setCategoryId] = useState(other?.id ?? "");
  const db = adminBrowserClient();

  return (
    <div className="m-card space-y-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-xl font-semibold">{s.item_name}</p>
          {s.quantity_text && <p className="text-stone-700">Amount: {s.quantity_text}</p>}
          {s.note && <p className="italic text-stone-600">&ldquo;{s.note}&rdquo;</p>}
        </div>
        <span className="text-sm text-stone-500">{formatDateTime(s.created_at)}</span>
      </div>
      <p>
        <span className="font-semibold">{s.contributor_name}</span>
        {s.phone && (
          <>
            {" · "}
            <a href={`tel:${s.phone}`} className="text-sage-700 underline">
              {s.phone}
            </a>
          </>
        )}
        {s.email && (
          <>
            {" · "}
            <a href={`mailto:${s.email}`} className="text-sage-700 underline">
              {s.email}
            </a>
          </>
        )}
      </p>
      <ErrorNote error={error} />
      <div className="flex flex-wrap items-center gap-2">
        <select className="m-admin-input w-auto" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category to add it under">
          {!other && <option value="">Other (new category)</option>}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="m-admin-btn bg-sage-700 text-white hover:bg-sage-800"
          disabled={busy}
          onClick={() => run(() => db.rpc("approve_suggested_item", { p_suggestion_id: s.id, p_category_id: categoryId || null }))}
        >
          APPROVE
        </button>
        <button
          type="button"
          className={`${btn} text-red-700`}
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Decline "${s.item_name}" from ${s.contributor_name}?`)) {
              run(() =>
                db
                  .from("suggested_items")
                  .update({ status: "declined", reviewed_at: new Date().toISOString() })
                  .eq("id", s.id)
                  .eq("status", "pending")
              );
            }
          }}
        >
          DECLINE
        </button>
      </div>
    </div>
  );
}
