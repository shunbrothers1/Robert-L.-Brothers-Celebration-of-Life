import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MemorialHeader from "../_components/MemorialHeader";
import FoodBoard from "../_components/FoodBoard";
import ShareButtons from "../_components/ShareButtons";
import MemorialSection from "../_components/MemorialSection";
import { loadPublicEvent } from "@/lib/celebration/load";
import { shareMessage } from "@/lib/celebration/format";

// Counts must always be live — never serve a cached list.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadPublicEvent(slug);
  if (!loaded) return { title: "Celebration of Life", robots: { index: false, follow: false } };
  const { event } = loaded.data;
  const title = `${event.person_name} — ${event.event_name}`;
  const description = shareMessage(event.person_name);
  // These drive the link preview people see when the page is texted.
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", images: event.photo_url ? [{ url: event.photo_url }] : undefined },
    twitter: { card: event.photo_url ? "summary_large_image" : "summary", title, description },
  };
}

export default async function CelebrationPage({ params }: Props) {
  const { slug } = await params;
  const loaded = await loadPublicEvent(slug);
  if (!loaded) notFound();
  const { data, preview } = loaded;
  const { event } = data;

  return (
    <main className="m-page pb-16">
      {preview && (
        <div className="bg-gold-700 px-4 py-2 text-center text-sm font-semibold text-white">
          Preview — this page isn&apos;t published yet. Only family admins can see it.
        </div>
      )}

      <MemorialHeader event={event} />

      <div className="mx-auto max-w-2xl px-4">
        {event.welcome_message && (
          <div className="m-card p-6 sm:p-8">
            <p className="whitespace-pre-line text-center font-display text-[1.2rem] leading-relaxed text-stone-700">
              {event.welcome_message}
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <a href="#food-list" className="m-btn-primary min-h-[60px] w-full px-8 text-lg sm:w-auto">
            VIEW FOOD &amp; SUPPLY LIST
          </a>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-stone-600">
            Please select an item that is still needed so we can provide a variety of food for everyone.
          </p>
        </div>
      </div>

      <div className="mt-12">
        <FoodBoard data={data} />
      </div>

      {data.settings.show_memorial_section && event.memorial && (
        <div className="mt-16">
          <MemorialSection personName={event.person_name} memorial={event.memorial} />
        </div>
      )}

      <div className="mx-auto mt-12 max-w-2xl px-4">
        <ShareButtons personName={event.person_name} path={`/celebration/${event.slug}`} />
        <p className="mt-10 text-center font-display text-lg italic text-stone-500">With love and gratitude, the family</p>
      </div>
    </main>
  );
}
