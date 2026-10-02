"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import ItemCard from "./ItemCard";
import SignupModal from "./SignupModal";
import SuggestModal from "./SuggestModal";
import { formatDeadline, itemProgress } from "@/lib/celebration/format";
import { parseSignups, readSignupsSnapshot, subscribeToSignups } from "@/lib/celebration/device-memory";
import type { PublicEvent, PublicItem } from "@/lib/celebration/types";

const ALL = "all";

export default function FoodBoard({ data }: { data: PublicEvent }) {
  const router = useRouter();
  const { event, settings, categories, items, signups_open: signupsOpen } = data;
  const [filter, setFilter] = useState<string>(ALL);
  const [onlyNeeded, setOnlyNeeded] = useState(false);
  const [selected, setSelected] = useState<PublicItem | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  // Sign-ups made from this phone (kept in its browser storage).
  const mineRaw = useSyncExternalStore(subscribeToSignups, readSignupsSnapshot, () => "");
  const mine = useMemo(() => parseSignups(mineRaw, event.slug), [mineRaw, event.slug]);

  // Refresh counts whenever the guest comes back to the tab (others may
  // have signed up meanwhile).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  // Keep the open sign-up form in sync with fresh counts after a refresh.
  const selectedLive = selected ? (items.find((i) => i.id === selected.id) ?? selected) : null;

  const visibleCategories = useMemo(
    () => categories.filter((c) => items.some((i) => i.category_id === c.id)),
    [categories, items]
  );

  const totals = useMemo(() => {
    const covered = items.filter((i) => itemProgress(i).status === "covered").length;
    return { covered, total: items.length };
  }, [items]);

  const isCovered = (i: PublicItem) => itemProgress(i).status === "covered";
  const passesToggle = (i: PublicItem) => !onlyNeeded || !isCovered(i);

  // With "All" selected, uncovered priority items get their own group at
  // the top (and are left out of their category below, so nothing shows
  // twice). In a single category they simply sort first.
  const mostNeeded = filter === ALL ? items.filter((i) => i.is_priority && !isCovered(i)) : [];
  const mostNeededIds = new Set(mostNeeded.map((i) => i.id));

  const groups = visibleCategories
    .filter((c) => filter === ALL || c.id === filter)
    .map((c) => ({
      category: c,
      items: items
        .filter((i) => i.category_id === c.id && !mostNeededIds.has(i.id) && passesToggle(i))
        .sort((a, b) => Number(isCovered(a)) - Number(isCovered(b))),
    }))
    .filter((g) => g.items.length > 0);

  const deadline = formatDeadline(event.signup_deadline);
  const nothingShown = mostNeeded.length === 0 && groups.length === 0;

  return (
    <section id="food-list" className="scroll-mt-4" aria-labelledby="food-list-title">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <p className="m-eyebrow">For the Repast</p>
          <h2 id="food-list-title" className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            Food &amp; Supply List
          </h2>
          {items.length > 0 && (
            <p className="mt-2 text-[16px] text-slate-600">
              {totals.covered === 0
                ? `${totals.total} items on the list`
                : `${totals.covered} of ${totals.total} items covered — thank you!`}
            </p>
          )}
          {signupsOpen && deadline && (
            <p className="mt-2 text-[16px] font-semibold text-gold-700">Please sign up by {deadline}.</p>
          )}
        </div>

        {!signupsOpen && (
          <div className="m-card mt-6 bg-mist-100 p-5 text-center" role="status">
            <p className="font-display text-xl font-semibold">
              {data.deadline_passed ? "Sign-ups have closed" : "Sign-ups are paused"}
            </p>
            <p className="mt-1 text-[16px] text-slate-600">
              Thank you for your love and support. If you&apos;d still like to help, please contact the family directly.
            </p>
          </div>
        )}

        {mine.length > 0 && (
          <div className="m-card mt-6 border-navy-200 bg-navy-50 p-5">
            <p className="font-display text-lg font-semibold text-navy-800">Your sign-ups from this phone</p>
            <ul className="mt-3 space-y-2">
              {mine.map((s) => (
                <li key={s.token} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-navy-100">
                  <span className="text-[16px]">
                    <span className="font-semibold">{s.itemName}</span>
                    {s.amount ? ` — ${s.amount}` : ""}
                    {s.kind === "suggestion" && <span className="text-slate-500"> (suggestion)</span>}
                  </span>
                  <a href={`/contribution/${s.token}`} className="text-[15px] font-semibold text-navy-700 underline underline-offset-4">
                    View / change
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Filters — stick to the top while scrolling the list. */}
      <div className="sticky top-0 z-30 mt-6 border-y border-mist-300 bg-mist/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filter by category">
            {[{ id: ALL, short_name: "ALL" }, ...visibleCategories].map((c) => {
              const active = filter === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(c.id)}
                  className={`m-chip ${active ? "border-navy-700 bg-navy-700 text-white" : "border-mist-400 bg-white text-charcoal hover:border-navy-500"}`}
                >
                  {c.short_name.toUpperCase()}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-pressed={onlyNeeded}
            onClick={() => setOnlyNeeded((v) => !v)}
            className={`m-chip mt-2 w-full justify-center gap-2 ${onlyNeeded ? "border-gold-700 bg-gold-700 text-white" : "border-gold-500 bg-white text-gold-700"}`}
          >
            <span aria-hidden="true">{onlyNeeded ? "✓" : "○"}</span>
            SHOW WHAT&apos;S STILL NEEDED
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-10 px-4 pt-8">
        {mostNeeded.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 font-display text-2xl font-semibold text-gold-700">
              <span aria-hidden="true">★</span> Most Needed
            </h3>
            <p className="mt-1 text-[16px] text-slate-600">If you can, please consider one of these first.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {mostNeeded.map((item) => (
                <ItemCard key={item.id} item={item} signupsOpen={signupsOpen} onSignUp={setSelected} />
              ))}
            </div>
          </div>
        )}

        {groups.map(({ category, items: groupItems }) => (
          <div key={category.id}>
            <h3 className="border-b border-mist-300 pb-2 font-display text-2xl font-semibold">{category.name}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {groupItems.map((item) => (
                <ItemCard key={item.id} item={item} signupsOpen={signupsOpen} onSignUp={setSelected} />
              ))}
            </div>
          </div>
        ))}

        {nothingShown && (
          <div className="m-card p-8 text-center">
            <p className="font-display text-xl font-semibold">
              {onlyNeeded ? "Everything here is covered — thank you!" : "The list is being prepared."}
            </p>
            {onlyNeeded && (
              <button type="button" className="m-btn-outline mt-4" onClick={() => setOnlyNeeded(false)}>
                Show everything
              </button>
            )}
          </div>
        )}

        {settings.allow_suggestions && signupsOpen && (
          <div className="m-card bg-mist-100 p-6 text-center">
            <h3 className="font-display text-2xl font-semibold">Want to bring something that isn&apos;t listed?</h3>
            <p className="mt-2 text-[16px] text-slate-600">We appreciate it! Let us know what you&apos;d like to bring.</p>
            <button type="button" className="m-btn-outline mt-5 w-full sm:w-auto" onClick={() => setSuggesting(true)}>
              SUGGEST AN ITEM
            </button>
          </div>
        )}
      </div>

      {/* Keyed by item so each form opens fresh (and prefilled from this phone). */}
      <SignupModal
        key={selectedLive?.id ?? "none"}
        item={selectedLive}
        slug={event.slug}
        personName={event.person_name}
        onClose={() => setSelected(null)}
        onChanged={() => router.refresh()}
      />
      {suggesting && <SuggestModal slug={event.slug} onClose={() => setSuggesting(false)} />}
    </section>
  );
}
