import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MemorialHeader from "../_components/MemorialHeader";
import FoodBoard from "../_components/FoodBoard";
import ShareButtons from "../_components/ShareButtons";
import MemorialSection from "../_components/MemorialSection";
import Flourish from "../_components/Flourish";
import HeroArt from "../_components/HeroArt";
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
    <main className="m-page-public pb-16">
      {preview && (
        <div className="bg-navy-800 px-4 py-2 text-center text-sm font-semibold text-white">
          <span className="text-gold-400">Preview</span> — this page isn&apos;t published yet. Only family admins can see it.
        </div>
      )}

      <section className="relative isolate overflow-hidden pb-36 sm:pb-24">
        <HeroArt artworkUrl={event.background_image_url} />
        <MemorialHeader event={event} />

        <div className="mx-auto max-w-2xl px-4">
          {event.welcome_message && (
            <div className="m-card border-gold-400/80 bg-ivory p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-8">
              <Flourish />
              <p className="my-5 whitespace-pre-line text-center font-display text-[1.25rem] leading-relaxed text-charcoal">
                {event.welcome_message}
              </p>
              <Flourish />
            </div>
          )}

          <div className="mt-8 text-center">
            <a href="#food-list" className="m-btn-hero min-h-[64px] w-full whitespace-nowrap px-5 font-display text-[17px] tracking-[0.04em] sm:w-auto sm:px-10 sm:text-lg sm:tracking-[0.08em]">
              <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-gold-400" aria-hidden="true">
                <path d="M4 1v7a2.5 2.5 0 0 0 5 0V1M6.5 1v20M15 21V1c-2.5 1.5-3.5 4-3.5 7v5H15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="h-6 w-px shrink-0 bg-gold-400/60" aria-hidden="true" />
              VIEW FOOD &amp; SUPPLY LIST
              <span aria-hidden="true" className="hidden text-gold-400 sm:inline">›</span>
            </a>
            <div className="mx-auto mt-5 flex items-center justify-center gap-3 text-gold-400" aria-hidden="true">
              <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold-400" />
              <span className="text-xs">◆</span>
              <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold-400" />
            </div>
            <p className="mx-auto mt-3 max-w-md font-display text-[16px] text-white/85">
              Please select an item that is still needed so we can provide a variety of food for everyone.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-4">
        <FoodBoard data={data} />
      </div>

      {data.settings.show_memorial_section && event.memorial && (
        <div className="mt-16">
          <MemorialSection personName={event.person_name} memorial={event.memorial} />
        </div>
      )}

      <div className="mx-auto mt-12 max-w-2xl px-4">
        <ShareButtons personName={event.person_name} path={`/celebration/${event.slug}`} />
        <p className="mt-10 text-center font-display text-lg italic text-white/70">With love and gratitude, the family</p>
      </div>
    </main>
  );
}
