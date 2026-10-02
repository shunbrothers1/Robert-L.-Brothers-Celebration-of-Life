"use client";

import { useMemo, useState } from "react";
import Modal from "@/app/celebration/_components/Modal";
import { ErrorNote, useAdminAction } from "../../../_components/useAdminAction";
import { adminBrowserClient } from "@/lib/celebration/browser";
import { formatAmount, formatDateTime, itemProgress } from "@/lib/celebration/format";
import type { ItemWithClaims } from "@/lib/celebration/stats";
import type { Contribution, ContributionStatus, FoodCategory } from "@/lib/celebration/types";

const btn = "m-admin-btn bg-white ring-1 ring-cream-400 hover:bg-cream-100";

const STATUS_BADGE: Record<ContributionStatus, string> = {
  confirmed: "bg-gold-50 text-gold-700",
  received: "bg-sage-100 text-sage-800",
  cancelled: "bg-stone-200 text-stone-600",
};

type Draft = {
  id: string | null;
  food_item_id: string;
  contributor_name: string;
  phone: string;
  email: string;
  quantity: number;
  note: string;
};

export default function ContributorManager({
  eventId,
  contributions,
  items,
  categories,
}: {
  eventId: string;
  contributions: Contribution[];
  items: ItemWithClaims[];
  categories: FoodCategory[];
}) {
  const { run, busy, error } = useAdminAction();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"active" | ContributionStatus | "all">("active");
  const [draft, setDraft] = useState<Draft | null>(null);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const db = adminBrowserClient();

  const filtered = contributions.filter((c) => {
    if (status === "active" && c.status === "cancelled") return false;
    if (status !== "active" && status !== "all" && c.status !== status) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    const item = itemById.get(c.food_item_id);
    return [c.contributor_name, c.phone, c.email, c.note, item?.name].some((v) => v?.toLowerCase().includes(q));
  });

  const setStatusFor = (c: Contribution, next: ContributionStatus) =>
    run(() => db.from("contributions").update({ status: next }).eq("id", c.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="m-admin-input max-w-xs"
          placeholder="Search name, phone, item…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search contributors"
        />
        <select className="m-admin-input w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
          <option value="active">Active (confirmed + received)</option>
          <option value="confirmed">Confirmed</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
        <div className="ml-auto flex flex-wrap gap-2">
          <a href={`/admin/events/${eventId}/export`} className={btn}>
            Download CSV
          </a>
          <button
            type="button"
            className="m-admin-btn bg-sage-700 text-white hover:bg-sage-800"
            onClick={() =>
              setDraft({ id: null, food_item_id: items[0]?.id ?? "", contributor_name: "", phone: "", email: "", quantity: 1, note: "" })
            }
            disabled={items.length === 0}
          >
            + Add sign-up
          </button>
        </div>
      </div>

      <ErrorNote error={error} />
      <p className="text-sm text-stone-500">
        {filtered.length} sign-up{filtered.length === 1 ? "" : "s"} shown. Contact details are visible to admins only.
      </p>

      <div className="m-card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-5 text-stone-500">No sign-ups match.</p>
        ) : (
          <ul className="divide-y divide-cream-200">
            {filtered.map((c) => {
              const item = itemById.get(c.food_item_id);
              return (
                <li key={c.id} className={`grid gap-3 p-4 lg:grid-cols-[1.2fr_1.2fr_1fr_auto] lg:items-center ${c.status === "cancelled" ? "opacity-60" : ""}`}>
                  <div className="min-w-0">
                    <p className="font-semibold">{c.contributor_name}</p>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="block text-sm text-sage-700 underline">
                        {c.phone}
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="block break-all text-sm text-sage-700 underline">
                        {c.email}
                      </a>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p>
                      <span className="font-semibold">{item?.name ?? "—"}</span> ·{" "}
                      {c.amount_detail ?? formatAmount(c.quantity, item?.unit ?? "")}
                    </p>
                    {c.note && <p className="text-sm italic text-stone-600">&ldquo;{c.note}&rdquo;</p>}
                  </div>
                  <div className="text-sm text-stone-600">
                    <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-bold uppercase ${STATUS_BADGE[c.status]}`}>{c.status}</span>
                    {formatDateTime(c.created_at)}
                    {c.source !== "public" && <span className="ml-1 text-xs">({c.source === "admin" ? "added by admin" : "from suggestion"})</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.status !== "cancelled" && (
                      <>
                        <button
                          type="button"
                          className={btn}
                          disabled={busy}
                          onClick={() =>
                            setDraft({
                              id: c.id,
                              food_item_id: c.food_item_id,
                              contributor_name: c.contributor_name,
                              phone: c.phone ?? "",
                              email: c.email ?? "",
                              quantity: c.quantity,
                              note: c.note ?? "",
                            })
                          }
                        >
                          Edit / Move
                        </button>
                        {c.status === "confirmed" ? (
                          <button type="button" className={btn} disabled={busy} onClick={() => setStatusFor(c, "received")}>
                            ✓ Received
                          </button>
                        ) : (
                          <button type="button" className={btn} disabled={busy} onClick={() => setStatusFor(c, "confirmed")}>
                            Undo received
                          </button>
                        )}
                        <button
                          type="button"
                          className={`${btn} text-red-700`}
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Cancel ${c.contributor_name}'s sign-up for ${item?.name}? The amount goes back on the public list.`)) {
                              setStatusFor(c, "cancelled");
                            }
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {c.status === "cancelled" && (
                      <button type="button" className={btn} disabled={busy} onClick={() => setStatusFor(c, "confirmed")}>
                        Restore
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {draft && (
        <ContributionEditor
          eventId={eventId}
          draft={draft}
          items={items}
          categories={categories}
          originalItemId={contributions.find((c) => c.id === draft.id)?.food_item_id ?? null}
          originalQuantity={contributions.find((c) => c.id === draft.id)?.quantity ?? 0}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  );
}

function ContributionEditor({
  eventId,
  draft: initial,
  items,
  categories,
  originalItemId,
  originalQuantity,
  onClose,
}: {
  eventId: string;
  draft: Draft;
  items: ItemWithClaims[];
  categories: FoodCategory[];
  originalItemId: string | null;
  originalQuantity: number;
  onClose: () => void;
}) {
  const [d, setD] = useState(initial);
  const { run, busy, error, setError } = useAdminAction();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const target = items.find((i) => i.id === d.food_item_id);
  // How much room the chosen item has for this sign-up (its own current
  // amount counts as room when it isn't moving).
  const room = target
    ? Math.max(0, target.quantity_needed - target.quantity_claimed) + (target.id === originalItemId ? originalQuantity : 0)
    : 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!d.contributor_name.trim()) return setError("Please enter a name.");
    if (!d.food_item_id) return setError("Please choose an item.");
    const values = {
      event_id: eventId,
      food_item_id: d.food_item_id,
      contributor_name: d.contributor_name.trim(),
      phone: d.phone.trim() || null,
      email: d.email.trim().toLowerCase() || null,
      quantity: Math.max(1, Math.floor(d.quantity) || 1),
      note: d.note.trim() || null,
    };
    const db = adminBrowserClient();
    // The capacity trigger re-checks availability for both edits and new
    // sign-ups, so an admin can't overclaim an item either.
    const ok = await run(() =>
      d.id ? db.from("contributions").update(values).eq("id", d.id) : db.from("contributions").insert({ ...values, source: "admin" })
    );
    if (ok) onClose();
  }

  return (
    <Modal open onClose={onClose} title={d.id ? "Edit sign-up" : "Add sign-up"}>
      <form onSubmit={save} className="space-y-4 text-[15px]" noValidate>
        <div>
          <label className="m-label" htmlFor="c-item">
            Item {d.id && <span className="font-normal text-stone-500">(choose another to move this sign-up)</span>}
          </label>
          <select id="c-item" className="m-admin-input" value={d.food_item_id} onChange={(e) => set("food_item_id", e.target.value)}>
            {categories.map((cat) => (
              <optgroup key={cat.id} label={cat.name}>
                {items
                  .filter((i) => i.category_id === cat.id)
                  .map((i) => {
                    const p = itemProgress(i);
                    return (
                      <option key={i.id} value={i.id}>
                        {i.name} — {p.status === "covered" ? "covered" : `${p.remaining} open`}
                      </option>
                    );
                  })}
              </optgroup>
            ))}
          </select>
          {target && (
            <p className="mt-1 text-xs text-stone-500">
              Room for this sign-up: {formatAmount(room, target.unit)}. To go over, raise the item&apos;s quantity on the Food List first.
            </p>
          )}
        </div>
        <div>
          <label className="m-label" htmlFor="c-name">
            Name
          </label>
          <input id="c-name" className="m-admin-input" value={d.contributor_name} maxLength={100} onChange={(e) => set("contributor_name", e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="m-label" htmlFor="c-phone">
              Phone
            </label>
            <input id="c-phone" type="tel" className="m-admin-input" value={d.phone} maxLength={30} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label className="m-label" htmlFor="c-email">
              Email
            </label>
            <input id="c-email" type="email" className="m-admin-input" value={d.email} maxLength={200} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="m-label" htmlFor="c-qty">
            Quantity {target?.unit ? `(${target.unit})` : ""}
          </label>
          <input id="c-qty" type="number" min={1} max={999} className="m-admin-input" value={d.quantity} onChange={(e) => set("quantity", Number(e.target.value))} />
        </div>
        <div>
          <label className="m-label" htmlFor="c-note">
            Note
          </label>
          <textarea id="c-note" className="m-admin-input min-h-[70px]" value={d.note} maxLength={500} onChange={(e) => set("note", e.target.value)} />
        </div>
        <ErrorNote error={error} />
        <div className="flex gap-2">
          <button type="submit" className="m-admin-btn bg-sage-700 text-white hover:bg-sage-800" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" className={btn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
