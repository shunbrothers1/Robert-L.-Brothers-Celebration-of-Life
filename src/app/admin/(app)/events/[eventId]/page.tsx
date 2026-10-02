import Link from "next/link";
import { notFound } from "next/navigation";
import CopyPublicLink from "./CopyPublicLink";
import { loadEventBundle } from "@/lib/celebration/admin-data";
import { computeOverview } from "@/lib/celebration/stats";
import { formatAmount, formatDateTime, itemProgress } from "@/lib/celebration/format";

export const metadata = { title: "Overview" };

function Stat({ label, value, hint, tone = "" }: { label: string; value: number | string; hint: string; tone?: string }) {
  return (
    <div className="m-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-3xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs leading-snug text-slate-500">{hint}</p>
    </div>
  );
}

export default async function OverviewPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const bundle = await loadEventBundle(eventId);
  if (!bundle) notFound();
  const { event, items, suggestions, categories, contributions } = bundle;
  const stats = computeOverview(items, suggestions);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const stillNeeded = items
    .filter((i) => !i.is_hidden && itemProgress(i).status !== "covered")
    .sort((a, b) => Number(b.is_priority) - Number(a.is_priority));
  const recent = contributions.filter((c) => c.status !== "cancelled").slice(0, 6);
  const itemName = new Map(items.map((i) => [i.id, i]));

  return (
    <div className="space-y-6">
      <div className="m-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Repast Preparation</h2>
          <p className="font-display text-2xl font-semibold text-navy-700">{stats.percentCovered}% Covered</p>
        </div>
        <div
          className="mt-3 h-4 overflow-hidden rounded-full bg-mist-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={stats.percentCovered}
          aria-label="Repast preparation"
        >
          <div className="h-full rounded-full bg-navy-600" style={{ width: `${stats.percentCovered}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">How much of the total amount needed has been signed up for so far.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat
          label="Total Items Needed"
          value={stats.totalItemsNeeded}
          hint="Every quantity on the list added up — all the trays, cases, bags, etc."
        />
        <Stat
          label="Contributions Claimed"
          value={stats.totalClaimed}
          hint="How much of that total people have signed up to bring so far."
        />
        <Stat
          label="Items Still Needed"
          value={stats.itemsStillNeeded}
          tone="text-gold-700"
          hint="Different dishes and supplies that still need someone (e.g. Ham, Ice)."
        />
        <Stat
          label="Items Fully Covered"
          value={stats.itemsCovered}
          tone="text-navy-700"
          hint="Dishes and supplies that have everything they need."
        />
        <Stat
          label="Pending Suggestions"
          value={stats.pendingSuggestions}
          hint="“Bring something else” offers waiting for your approval."
        />
        <Stat label="Total Contributors" value={stats.totalContributors} hint="Different people who have signed up." />
      </div>

      {!event.is_published && (
        <div className="m-card border-gold-400 bg-gold-50 p-4">
          <p className="font-semibold">This event is still a draft.</p>
          <p className="text-slate-700">
            Guests can&apos;t see it yet. When you&apos;re ready, publish it from{" "}
            <Link href={`/admin/events/${event.id}/settings`} className="font-semibold underline">
              Event Settings
            </Link>
            .
          </p>
        </div>
      )}

      <CopyPublicLink slug={event.slug} personName={event.person_name} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="m-card p-5">
          <h2 className="font-display text-xl font-semibold">Still needed</h2>
          {stillNeeded.length === 0 ? (
            <p className="mt-2 text-slate-600">Everything on the list is covered. 🎉</p>
          ) : (
            <ul className="mt-3 divide-y divide-mist-200">
              {stillNeeded.map((i) => {
                const p = itemProgress(i);
                return (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {i.is_priority && <span className="mr-1 text-gold-700">★</span>}
                      <span className="font-semibold">{i.name}</span>{" "}
                      <span className="text-sm text-slate-500">· {categoryName.get(i.category_id)}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-gold-700">
                      {formatAmount(p.remaining, i.unit)} more
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="m-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Latest sign-ups</h2>
            <Link href={`/admin/events/${event.id}/contributors`} className="text-sm font-semibold text-navy-700 underline">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-2 text-slate-600">No sign-ups yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-mist-200">
              {recent.map((c) => {
                const item = itemName.get(c.food_item_id);
                return (
                  <li key={c.id} className="py-2">
                    <p>
                      <span className="font-semibold">{c.contributor_name}</span> —{" "}
                      {item?.name} ({c.amount_detail ?? formatAmount(c.quantity, item?.unit ?? "")})
                    </p>
                    <p className="text-sm text-slate-500">{formatDateTime(c.created_at)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
