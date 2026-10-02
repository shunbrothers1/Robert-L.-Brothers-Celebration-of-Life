"use client";

import { useState } from "react";
import Modal from "@/app/celebration/_components/Modal";
import { ErrorNote, useAdminAction } from "../../../_components/useAdminAction";
import { adminBrowserClient } from "@/lib/celebration/browser";
import { formatAmount, itemProgress, STATUS_LABEL } from "@/lib/celebration/format";
import type { ItemWithClaims } from "@/lib/celebration/stats";
import type { FoodCategory } from "@/lib/celebration/types";

type ItemDraft = {
  id: string | null;
  name: string;
  category_id: string;
  quantity_needed: number;
  unit: string;
  description: string;
  is_priority: boolean;
  is_hidden: boolean;
  manually_covered: boolean;
  sort_order: number;
};

const btn = "m-admin-btn bg-white ring-1 ring-mist-400 hover:bg-mist-100";

export default function MenuManager({
  eventId,
  categories,
  items,
}: {
  eventId: string;
  categories: FoodCategory[];
  items: ItemWithClaims[];
}) {
  const { run, busy, error } = useAdminAction();
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [showCategories, setShowCategories] = useState(categories.length === 0);
  const db = adminBrowserClient();

  function newItem(categoryId?: string) {
    const categoryItems = items.filter((i) => i.category_id === (categoryId ?? categories[0]?.id));
    setDraft({
      id: null,
      name: "",
      category_id: categoryId ?? categories[0]?.id ?? "",
      quantity_needed: 1,
      unit: "",
      description: "",
      is_priority: false,
      is_hidden: false,
      manually_covered: false,
      sort_order: (Math.max(0, ...categoryItems.map((i) => i.sort_order)) || 0) + 10,
    });
  }

  function editItem(i: ItemWithClaims) {
    setDraft({
      id: i.id,
      name: i.name,
      category_id: i.category_id,
      quantity_needed: i.quantity_needed,
      unit: i.unit,
      description: i.description ?? "",
      is_priority: i.is_priority,
      is_hidden: i.is_hidden,
      manually_covered: i.manually_covered,
      sort_order: i.sort_order,
    });
  }

  const patch = (id: string, values: Record<string, unknown>) => run(() => db.from("food_items").update(values).eq("id", id));

  async function remove(i: ItemWithClaims) {
    const n = i.contributions.length;
    const warning = n
      ? `Delete "${i.name}"? ${n} active sign-up${n === 1 ? "" : "s"} for it will be deleted too. (Tip: "Hide" keeps them.)`
      : `Delete "${i.name}"?`;
    if (!window.confirm(warning)) return;
    await run(() => db.from("food_items").delete().eq("id", i.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate-600">
          Everything guests see on the food list. Quantities can&apos;t go below what&apos;s already been claimed.
        </p>
        <div className="flex gap-2">
          <button type="button" className={btn} onClick={() => setShowCategories((v) => !v)}>
            {showCategories ? "Hide categories" : "Edit categories"}
          </button>
          <button
            type="button"
            className="m-admin-btn bg-navy-700 text-white hover:bg-navy-800"
            onClick={() => newItem()}
            disabled={categories.length === 0}
          >
            + Add item
          </button>
        </div>
      </div>

      <ErrorNote error={error} />

      {showCategories && <CategoryEditor eventId={eventId} categories={categories} items={items} />}

      {categories.map((c) => {
        const list = items.filter((i) => i.category_id === c.id);
        return (
          <section key={c.id} className="m-card overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-mist-200 bg-mist-100 px-4 py-3">
              <h2 className="font-display text-lg font-semibold">
                {c.name} <span className="text-sm font-normal text-slate-500">({list.length})</span>
              </h2>
              <button type="button" className={btn} onClick={() => newItem(c.id)}>
                + Add to {c.short_name.toLowerCase()}
              </button>
            </div>
            {list.length === 0 ? (
              <p className="px-4 py-3 text-slate-500">No items yet.</p>
            ) : (
              <ul className="divide-y divide-mist-200">
                {list.map((i) => {
                  const p = itemProgress(i);
                  return (
                    <li key={i.id} className={`flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between ${i.is_hidden ? "opacity-60" : ""}`}>
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {i.is_priority && <span className="mr-1 text-gold-700" title="Most needed">★</span>}
                          {i.name}
                          {i.is_hidden && <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-bold uppercase text-slate-600">Hidden</span>}
                          {i.manually_covered && <span className="ml-2 rounded bg-navy-100 px-1.5 py-0.5 text-xs font-bold uppercase text-navy-800">Marked covered</span>}
                        </p>
                        <p className="text-sm text-slate-600">
                          {p.claimed} of {formatAmount(i.quantity_needed, i.unit)} claimed · {STATUS_LABEL[p.status]}
                          {i.description ? ` · ${i.description}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" className={btn} onClick={() => editItem(i)} disabled={busy}>
                          Edit
                        </button>
                        <button type="button" className={btn} onClick={() => patch(i.id, { is_priority: !i.is_priority })} disabled={busy}>
                          {i.is_priority ? "Unmark priority" : "★ Most needed"}
                        </button>
                        {p.status === "covered" ? (
                          <button
                            type="button"
                            className={btn}
                            disabled={busy}
                            onClick={() => {
                              if (i.manually_covered) return patch(i.id, { manually_covered: false });
                              // Fully claimed: reopening means asking for more.
                              const more = window.prompt(`"${i.name}" is fully claimed. How many more ${i.unit || "items"} are needed?`, "1");
                              const n = Number(more);
                              if (more !== null && Number.isInteger(n) && n > 0) {
                                return patch(i.id, { quantity_needed: i.quantity_needed + n });
                              }
                            }}
                          >
                            Reopen
                          </button>
                        ) : (
                          <button type="button" className={btn} onClick={() => patch(i.id, { manually_covered: true })} disabled={busy}>
                            Mark covered
                          </button>
                        )}
                        <button type="button" className={btn} onClick={() => patch(i.id, { is_hidden: !i.is_hidden })} disabled={busy}>
                          {i.is_hidden ? "Show" : "Hide"}
                        </button>
                        <button type="button" className={`${btn} text-red-700`} onClick={() => remove(i)} disabled={busy}>
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      {draft && (
        <ItemEditor
          eventId={eventId}
          draft={draft}
          categories={categories}
          claimed={items.find((i) => i.id === draft.id)?.quantity_claimed ?? 0}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  );
}

function ItemEditor({
  eventId,
  draft: initial,
  categories,
  claimed,
  onClose,
}: {
  eventId: string;
  draft: ItemDraft;
  categories: FoodCategory[];
  claimed: number;
  onClose: () => void;
}) {
  const [d, setD] = useState(initial);
  const { run, busy, error, setError } = useAdminAction();
  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!d.name.trim()) return setError("Please enter the item name.");
    if (!d.category_id) return setError("Please choose a category.");
    const values = {
      event_id: eventId,
      name: d.name.trim(),
      category_id: d.category_id,
      quantity_needed: Math.max(0, Math.floor(d.quantity_needed) || 0),
      unit: d.unit.trim(),
      description: d.description.trim() || null,
      is_priority: d.is_priority,
      is_hidden: d.is_hidden,
      manually_covered: d.manually_covered,
      sort_order: Math.floor(d.sort_order) || 0,
    };
    const db = adminBrowserClient();
    const ok = await run(() => (d.id ? db.from("food_items").update(values).eq("id", d.id) : db.from("food_items").insert(values)));
    if (ok) onClose();
  }

  return (
    <Modal open onClose={onClose} title={d.id ? "Edit item" : "Add item"}>
      <form onSubmit={save} className="space-y-4 text-[15px]" noValidate>
        <div>
          <label className="m-label" htmlFor="item-name">
            Item
          </label>
          <input id="item-name" className="m-admin-input" value={d.name} maxLength={100} onChange={(e) => set("name", e.target.value)} placeholder="Macaroni & Cheese" />
        </div>
        <div>
          <label className="m-label" htmlFor="item-category">
            Category
          </label>
          <select id="item-category" className="m-admin-input" value={d.category_id} onChange={(e) => set("category_id", e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="m-label" htmlFor="item-qty">
              Quantity needed
            </label>
            <input
              id="item-qty"
              type="number"
              min={Math.max(0, claimed)}
              max={999}
              className="m-admin-input"
              value={d.quantity_needed}
              onChange={(e) => set("quantity_needed", Number(e.target.value))}
            />
            {claimed > 0 && <p className="mt-1 text-xs text-slate-500">{claimed} already claimed</p>}
          </div>
          <div>
            <label className="m-label" htmlFor="item-unit">
              Unit (plural)
            </label>
            <input id="item-unit" className="m-admin-input" value={d.unit} maxLength={40} onChange={(e) => set("unit", e.target.value)} placeholder="large trays" />
          </div>
        </div>
        <div>
          <label className="m-label" htmlFor="item-desc">
            Serving description <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="item-desc"
            className="m-admin-input"
            value={d.description}
            maxLength={300}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Serves about 20"
          />
        </div>
        <div>
          <label className="m-label" htmlFor="item-sort">
            Sort order <span className="font-normal text-slate-500">(lower shows first)</span>
          </label>
          <input id="item-sort" type="number" className="m-admin-input" value={d.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} />
        </div>
        <fieldset className="space-y-2">
          <legend className="m-label">Options</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-5 w-5 accent-navy-700" checked={d.is_priority} onChange={(e) => set("is_priority", e.target.checked)} />
            Priority — show as &ldquo;Most Needed&rdquo;
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-5 w-5 accent-navy-700" checked={d.manually_covered} onChange={(e) => set("manually_covered", e.target.checked)} />
            Mark covered (stop sign-ups for it)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-5 w-5 accent-navy-700" checked={d.is_hidden} onChange={(e) => set("is_hidden", e.target.checked)} />
            Hidden from the public page
          </label>
        </fieldset>
        <ErrorNote error={error} />
        <div className="flex gap-2">
          <button type="submit" className="m-admin-btn bg-navy-700 text-white hover:bg-navy-800" disabled={busy}>
            {busy ? "Saving…" : "Save item"}
          </button>
          <button type="button" className={btn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CategoryEditor({ eventId, categories, items }: { eventId: string; categories: FoodCategory[]; items: ItemWithClaims[] }) {
  const { run, busy, error, setError } = useAdminAction();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const db = adminBrowserClient();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Please enter a category name.");
    const ok = await run(() =>
      db.from("food_categories").insert({
        event_id: eventId,
        name: name.trim(),
        short_name: (shortName.trim() || name.trim()).toUpperCase().slice(0, 24),
        sort_order: (Math.max(0, ...categories.map((c) => c.sort_order)) || 0) + 10,
      })
    );
    if (ok) {
      setName("");
      setShortName("");
    }
  }

  return (
    <section className="m-card space-y-4 p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Categories</h2>
        <p className="text-sm text-slate-600">The short name is the label on the public filter buttons. Lower sort order shows first.</p>
      </div>
      <ErrorNote error={error} />
      <ul className="space-y-2">
        {categories.map((c) => (
          <CategoryRow key={c.id} category={c} itemCount={items.filter((i) => i.category_id === c.id).length} run={run} busy={busy} />
        ))}
      </ul>
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
        <input className="m-admin-input" placeholder="New category, e.g. Breakfast" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <input className="m-admin-input" placeholder="Short name" value={shortName} maxLength={24} onChange={(e) => setShortName(e.target.value)} />
        <button type="submit" className="m-admin-btn bg-navy-700 text-white hover:bg-navy-800" disabled={busy}>
          Add category
        </button>
      </form>
    </section>
  );
}

function CategoryRow({
  category,
  itemCount,
  run,
  busy,
}: {
  category: FoodCategory;
  itemCount: number;
  run: ReturnType<typeof useAdminAction>["run"];
  busy: boolean;
}) {
  const [name, setName] = useState(category.name);
  const [shortName, setShortName] = useState(category.short_name);
  const [sort, setSort] = useState(category.sort_order);
  const db = adminBrowserClient();
  const dirty = name !== category.name || shortName !== category.short_name || sort !== category.sort_order;

  return (
    <li className="grid items-center gap-2 sm:grid-cols-[1fr_10rem_6rem_auto]">
      <input className="m-admin-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label="Category name" />
      <input className="m-admin-input" value={shortName} maxLength={24} onChange={(e) => setShortName(e.target.value)} aria-label="Short name" />
      <input className="m-admin-input" type="number" value={sort} onChange={(e) => setSort(Number(e.target.value))} aria-label="Sort order" />
      <div className="flex gap-1.5">
        <button
          type="button"
          className={btn}
          disabled={!dirty || busy || !name.trim() || !shortName.trim()}
          onClick={() =>
            run(() =>
              db
                .from("food_categories")
                .update({ name: name.trim(), short_name: shortName.trim().toUpperCase(), sort_order: Math.floor(sort) || 0 })
                .eq("id", category.id)
            )
          }
        >
          Save
        </button>
        <button
          type="button"
          className={`${btn} text-red-700`}
          disabled={busy}
          title={itemCount ? "Move or delete its items first" : undefined}
          onClick={() => {
            if (itemCount) return window.alert(`"${category.name}" still has ${itemCount} item(s). Move or delete them first.`);
            if (window.confirm(`Delete the "${category.name}" category?`)) run(() => db.from("food_categories").delete().eq("id", category.id));
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
