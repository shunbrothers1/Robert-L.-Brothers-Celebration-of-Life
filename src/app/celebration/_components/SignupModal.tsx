"use client";

import { useState } from "react";
import Modal from "./Modal";
import QuantityStepper from "./QuantityStepper";
import ManageLinkBox from "./ManageLinkBox";
import { formatAmount, itemProgress } from "@/lib/celebration/format";
import { getRememberedContact, rememberContact, rememberSignup } from "@/lib/celebration/device-memory";
import type { ClaimResult, PublicItem } from "@/lib/celebration/types";

type Done = { result: ClaimResult; amount: string };

export default function SignupModal({
  item,
  slug,
  personName,
  onClose,
  onChanged,
}: {
  item: PublicItem | null;
  slug: string;
  personName: string;
  onClose: () => void;
  /** Called after a sign-up or a "someone beat you to it" error, to refresh the list. */
  onChanged: () => void;
}) {
  // The parent remounts this per item (key), so state starts fresh each
  // time, prefilled with what this phone remembered from last time.
  const [remembered] = useState(getRememberedContact);
  const [name, setName] = useState(remembered.name);
  const [phone, setPhone] = useState(remembered.phone);
  const [email, setEmail] = useState(remembered.email);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxOverride, setMaxOverride] = useState<number | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  if (!item) return null;

  const remaining = maxOverride ?? itemProgress(item).remaining;
  const max = Math.max(1, remaining);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setError(null);
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!acknowledged) {
      setError("Please check the box to confirm you'll bring this item.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/celebration/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: item.id, name, phone, email, quantity, note, acknowledged }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        if (body.code === "ITEM_FULL" && body.remaining && Number(body.remaining) > 0) {
          const left = Number(body.remaining);
          setMaxOverride(left);
          setQuantity((q) => Math.min(q, left));
        }
        if (res.status === 409) onChanged();
        return;
      }
      const result = body as ClaimResult;
      const amount = formatAmount(result.quantity, result.unit);
      rememberContact({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      rememberSignup({
        token: result.token,
        slug,
        itemName: result.item_name,
        amount,
        kind: "contribution",
        createdAt: new Date().toISOString(),
      });
      setDone({ result, amount });
      onChanged();
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Modal key="done" open onClose={onClose} title="Thank You ❤️">
        <div className="space-y-5 text-center">
          <p className="text-[17px] leading-relaxed text-stone-700">
            Thank you for helping our family celebrate the life of {personName}. Your contribution has been added to the
            repast list.
          </p>
          <div className="rounded-2xl bg-sage-50 p-4 ring-1 ring-sage-200">
            <p className="text-sm font-semibold uppercase tracking-wide text-sage-700">You signed up to bring:</p>
            <p className="mt-1 font-display text-xl font-semibold text-charcoal">
              {done.result.item_name} — {done.amount}
            </p>
          </div>
          <ManageLinkBox token={done.result.token} />
          <button type="button" className="m-btn-primary w-full" onClick={onClose}>
            RETURN TO FOOD LIST
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal key="form" open onClose={onClose} title="Sign Up to Bring">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <p className="m-label">What are you bringing?</p>
          <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-cream-300">
            <p className="font-display text-lg font-semibold">{item.name}</p>
            {item.description && <p className="text-[15px] text-stone-600">{item.description}</p>}
          </div>
        </div>

        <div>
          <label className="m-label" htmlFor="signup-name">
            Your Name <span className="text-red-700">*</span>
          </label>
          <input
            id="signup-name"
            className="m-input"
            autoComplete="name"
            autoCapitalize="words"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <p className="m-label" id="signup-qty-label">
            How much will you bring?
          </p>
          {max > 1 ? (
            <QuantityStepper
              value={quantity}
              min={1}
              max={max}
              unit={item.unit}
              labelledBy="signup-qty-label"
              onChange={setQuantity}
            />
          ) : (
            <p className="rounded-xl bg-white px-4 py-3 text-[17px] ring-1 ring-cream-300">{formatAmount(1, item.unit)}</p>
          )}
          {max > 1 && <p className="mt-1.5 text-sm text-stone-500">{max} still needed — bring as many as you&apos;re able.</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="m-label" htmlFor="signup-phone">
              Phone Number <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <input
              id="signup-phone"
              className="m-input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="m-label" htmlFor="signup-email">
              Email Address <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <input
              id="signup-email"
              className="m-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <p className="-mt-2 text-sm text-stone-500">Only the family can see your phone number and email.</p>

        <div>
          <label className="m-label" htmlFor="signup-note">
            Note <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <textarea
            id="signup-note"
            className="m-input min-h-[88px]"
            placeholder="Example: I'll bring this around 1 PM."
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-cream-300">
          <input
            type="checkbox"
            className="mt-0.5 h-6 w-6 shrink-0 accent-sage-700"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <span className="text-[16px] leading-snug">
            I understand that I am committing to bring this item for the repast.
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[16px] text-red-800 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <button type="submit" className="m-btn-primary w-full" disabled={submitting}>
          {submitting ? "Saving…" : "CONFIRM MY CONTRIBUTION"}
        </button>
      </form>
    </Modal>
  );
}
