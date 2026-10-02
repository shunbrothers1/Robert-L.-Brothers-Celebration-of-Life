"use client";

import Link from "next/link";
import { useState } from "react";
import QuantityStepper from "@/app/celebration/_components/QuantityStepper";
import { formatAmount, formatLongDate } from "@/lib/celebration/format";
import { forgetSignup } from "@/lib/celebration/device-memory";
import type { ManagedContribution } from "@/lib/celebration/types";

const STATUS_TEXT: Record<string, { label: string; tone: string }> = {
  confirmed: { label: "Confirmed", tone: "bg-navy-100 text-navy-800" },
  received: { label: "Received — thank you!", tone: "bg-navy-100 text-navy-800" },
  cancelled: { label: "Cancelled", tone: "bg-slate-200 text-slate-700" },
  pending: { label: "Pending Family Approval", tone: "bg-gold-50 text-gold-700" },
  approved: { label: "Approved", tone: "bg-navy-100 text-navy-800" },
  declined: { label: "Not needed this time", tone: "bg-slate-200 text-slate-700" },
  withdrawn: { label: "Withdrawn", tone: "bg-slate-200 text-slate-700" },
};

export default function ManageContribution({ token, initial }: { token: string; initial: ManagedContribution }) {
  const [c, setC] = useState(initial);
  const [quantity, setQuantity] = useState(initial.kind === "contribution" ? initial.quantity : 1);
  const [note, setNote] = useState(initial.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  async function send(method: "PATCH" | "DELETE") {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/celebration/contribution/${encodeURIComponent(token)}`, {
        method,
        headers: { "content-type": "application/json" },
        body: method === "PATCH" ? JSON.stringify({ quantity, note }) : undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      const next = body as ManagedContribution;
      setC(next);
      if (next.kind === "contribution") setQuantity(next.quantity);
      if (method === "DELETE") {
        forgetSignup(token);
        setMessage("Your sign-up has been cancelled. Thank you for letting us know.");
      } else {
        setMessage("Your changes have been saved. Thank you!");
      }
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
      setConfirmingCancel(false);
    }
  }

  const status = STATUS_TEXT[c.status] ?? STATUS_TEXT.confirmed;
  const isActiveClaim = c.kind === "contribution" && c.status === "confirmed";
  const isPendingSuggestion = c.kind === "suggestion" && c.status === "pending";
  const amount =
    c.kind === "contribution" ? (c.amount_detail ?? formatAmount(c.quantity, c.unit)) : c.amount_detail;
  const date = formatLongDate(c.event.event_date);
  const changed = c.kind === "contribution" && (quantity !== c.quantity || (note.trim() || null) !== (c.note || null));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <p className="m-eyebrow">{c.event.event_name}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">{c.event.person_name}</h1>
        {date && <p className="mt-1 text-slate-600">{date}</p>}
      </div>

      <div className="m-card space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {c.kind === "suggestion" ? "Your suggestion" : "You signed up to bring"}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold">{c.item_name}</p>
            {amount && <p className="text-[17px] text-slate-700">{amount}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${status.tone}`}>
            {status.label}
          </span>
        </div>
        <p className="text-[15px] text-slate-600">Signed up by {c.contributor_name}</p>

        {(c.event.repast_location_name || c.event.repast_time_text) && (
          <div className="rounded-xl bg-mist-100 p-4 text-[15px]">
            <p className="font-semibold">Where &amp; when to bring it</p>
            {c.event.repast_location_name && <p>{c.event.repast_location_name}</p>}
            {c.event.repast_address && <p className="text-slate-600">{c.event.repast_address}</p>}
            {c.event.repast_time_text && <p className="text-slate-600">{c.event.repast_time_text}</p>}
          </div>
        )}

        {isPendingSuggestion && (
          <p className="text-[15px] text-slate-600">
            The family will review your suggestion to avoid duplicate dishes. Check back here to see when it&apos;s
            approved.
          </p>
        )}
        {c.kind === "suggestion" && c.status === "approved" && (
          <p className="text-[15px] text-slate-600">Your suggestion was approved. Thank you!</p>
        )}
      </div>

      {message && (
        <p role="status" className="rounded-xl bg-navy-50 px-4 py-3 text-[16px] text-navy-800 ring-1 ring-navy-200">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[16px] text-red-800 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {isActiveClaim && c.kind === "contribution" && !c.amount_detail && (
        <div className="m-card space-y-5 p-6">
          <h2 className="font-display text-xl font-semibold">Change your sign-up</h2>
          <div>
            <p className="m-label" id="manage-qty">
              Amount
            </p>
            <QuantityStepper
              value={quantity}
              min={1}
              max={c.signups_open ? c.max_quantity : c.quantity}
              unit={c.unit}
              labelledBy="manage-qty"
              onChange={setQuantity}
            />
            <p className="mt-1.5 text-sm text-slate-500">
              {c.signups_open
                ? c.max_quantity > c.quantity
                  ? `You can bring up to ${formatAmount(c.max_quantity, c.unit)}.`
                  : "This item is now fully covered, so the amount can only go down."
                : "Sign-ups are closed, so the amount can only go down."}
            </p>
          </div>
          <div>
            <label className="m-label" htmlFor="manage-note">
              Note <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <textarea
              id="manage-note"
              className="m-input min-h-[80px]"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button type="button" className="m-btn-primary w-full" disabled={busy || !changed} onClick={() => send("PATCH")}>
            {busy ? "Saving…" : "SAVE CHANGES"}
          </button>
        </div>
      )}

      {(isActiveClaim || isPendingSuggestion) && (
        <div className="m-card p-6">
          {!confirmingCancel ? (
            <button type="button" className="m-btn-danger w-full" disabled={busy} onClick={() => setConfirmingCancel(true)}>
              {isPendingSuggestion ? "WITHDRAW MY SUGGESTION" : "CANCEL MY SIGN-UP"}
            </button>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-[17px] font-semibold">
                {isPendingSuggestion
                  ? "Withdraw this suggestion?"
                  : "Are you sure? This item will go back on the list for someone else to bring."}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="m-btn-quiet" disabled={busy} onClick={() => setConfirmingCancel(false)}>
                  Keep it
                </button>
                <button type="button" className="m-btn-danger" disabled={busy} onClick={() => send("DELETE")}>
                  {busy ? "…" : "Yes, cancel"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-center">
        <Link href={`/celebration/${c.event.slug}`} className="m-btn-outline w-full sm:w-auto">
          RETURN TO FOOD LIST
        </Link>
      </div>
    </div>
  );
}
