import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createPublicClient } from "@/lib/celebration/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Celebration of Life", robots: { index: false, follow: false } };

/**
 * /celebration on its own: goes straight to the event when only one is
 * published (the usual case), otherwise lists the published ones.
 */
export default async function CelebrationIndex() {
  const { data, error } = await createPublicClient()
    .from("memorial_events")
    .select("slug, person_name, event_name")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(20);
  // Surface a misconfigured Supabase connection in the logs instead of
  // silently showing "page not found".
  if (error) throw new Error(`Loading events failed: ${error.message}`);
  const events = (data ?? []) as { slug: string; person_name: string; event_name: string }[];
  if (events.length === 0) notFound();
  if (events.length === 1) redirect(`/celebration/${events[0].slug}`);

  return (
    <main className="m-page px-4 py-16">
      <div className="mx-auto max-w-lg space-y-4">
        {events.map((e) => (
          <Link key={e.slug} href={`/celebration/${e.slug}`} className="m-card block p-6 text-center">
            <p className="m-eyebrow">{e.event_name}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{e.person_name}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
