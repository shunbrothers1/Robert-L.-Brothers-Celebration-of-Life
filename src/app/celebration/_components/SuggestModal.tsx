"use client";

import { useState } from "react";
import Modal from "./Modal";
import ManageLinkBox from "./ManageLinkBox";
import { getRememberedContact, rememberContact, rememberSignup } from "@/lib/celebration/device-memory";

/** Mounted only while open, so each time it starts fresh. */
export default function SuggestModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [remembered] = useState(getRememberedContact);
  const [name, setName] = useState(remembered.name);
  const [phone, setPhone] = useState(remembered.phone);
  const [email] = useState(remembered.email);
  const [itemName, setItemName] = useState("");
  const [quantityText, setQuantityText] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneToken, setDoneToken] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (!itemName.trim()) return setError("Please tell us what you'd like to bring.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/celebration/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, name, phone, email, itemName, quantityText, note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      rememberContact({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      rememberSignup({
        token: body.token,
        slug,
        itemName: itemName.trim(),
        amount: quantityText.trim(),
        kind: "suggestion",
        createdAt: new Date().toISOString(),
      });
      setDoneToken(body.token);
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (doneToken) {
    return (
      <Modal key="done" open onClose={onClose} title="Thank You ❤️">
        <div className="space-y-5 text-center">
          <p className="text-[17px] leading-relaxed text-slate-700">
            We appreciate it! Your suggestion has been sent to the family.
          </p>
          <div className="rounded-2xl bg-gold-50 p-4 ring-1 ring-gold-100">
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">Status</p>
            <p className="mt-1 font-display text-xl font-semibold">Pending Family Approval</p>
            <p className="mt-2 text-[15px] text-slate-600">
              To avoid duplicate dishes, the family will review it. Check your link below to see when it&apos;s approved.
            </p>
          </div>
          <ManageLinkBox token={doneToken} />
          <button type="button" className="m-btn-primary w-full" onClick={onClose}>
            RETURN TO FOOD LIST
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal key="form" open onClose={onClose} title="Suggest an Item">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <p className="text-[16px] text-slate-600">
          We appreciate it! Let us know what you&apos;d like to bring. The family will confirm it so we don&apos;t end
          up with duplicates.
        </p>
        <div>
          <label className="m-label" htmlFor="suggest-name">
            Name <span className="text-red-700">*</span>
          </label>
          <input
            id="suggest-name"
            className="m-input"
            autoComplete="name"
            autoCapitalize="words"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="m-label" htmlFor="suggest-phone">
            Phone <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="suggest-phone"
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
          <label className="m-label" htmlFor="suggest-item">
            Item <span className="text-red-700">*</span>
          </label>
          <input
            id="suggest-item"
            className="m-input"
            placeholder="Example: Deviled Eggs"
            maxLength={100}
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
        </div>
        <div>
          <label className="m-label" htmlFor="suggest-qty">
            Quantity <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="suggest-qty"
            className="m-input"
            placeholder="Example: 2 dozen"
            maxLength={100}
            value={quantityText}
            onChange={(e) => setQuantityText(e.target.value)}
          />
        </div>
        <div>
          <label className="m-label" htmlFor="suggest-note">
            Notes <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id="suggest-note"
            className="m-input min-h-[88px]"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <p className="-mt-2 text-sm text-slate-500">Only the family can see your phone number.</p>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[16px] text-red-800 ring-1 ring-red-200">
            {error}
          </p>
        )}
        <button type="submit" className="m-btn-primary w-full" disabled={submitting}>
          {submitting ? "Sending…" : "SEND SUGGESTION"}
        </button>
      </form>
    </Modal>
  );
}
